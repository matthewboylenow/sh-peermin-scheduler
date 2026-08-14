import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events } from '@/db/schema';
import { and, asc, gte, lte } from 'drizzle-orm';

/**
 * GET /api/public/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * The parish website's youth ministry page embeds this. It is the only
 * unauthenticated view of the schedule, so the column list below is the
 * security boundary and is deliberately explicit rather than a spread of the
 * row: what, when and where only.
 *
 * Never add slots, assignments, or anything reachable from them. Peer
 * ministers are minors, and an earlier public calendar was removed precisely
 * because it exposed who was assigned to what. Titles, times and locations are
 * the same information a parish bulletin prints.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const isDate = (value: string | null): value is string =>
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

    if (!isDate(start) || !isDate(end)) {
      return NextResponse.json(
        { error: 'start and end are required, as YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // A window this wide is already generous for a month view; capping it
    // keeps a crafted URL from asking for the entire table.
    const spanDays =
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000;
    if (!Number.isFinite(spanDays) || spanDays < 0 || spanDays > 366) {
      return NextResponse.json(
        { error: 'Range must be between 0 and 366 days' },
        { status: 400 }
      );
    }

    const rows = await db.query.events.findMany({
      where: and(gte(events.eventDate, start), lte(events.eventDate, end)),
      orderBy: [asc(events.eventDate), asc(events.startTime)],
      columns: {
        id: true,
        title: true,
        description: true,
        eventType: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        location: true,
        signupUrl: true,
      },
    });

    return NextResponse.json(rows, {
      headers: {
        // Public and identical for every visitor, so let the CDN carry it —
        // an embed on the parish homepage shouldn't wake the database per view.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching public calendar:', error);
    return NextResponse.json(
      { error: 'Failed to load the calendar' },
      { status: 500 }
    );
  }
}
