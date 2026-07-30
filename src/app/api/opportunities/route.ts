import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events } from '@/db/schema';
import { and, asc, gte, isNotNull } from 'drizzle-orm';
import { getPeerSession } from '@/lib/peer-session';
import { todayInEastern } from '@/lib/datetime';

/**
 * GET /api/opportunities
 *
 * Upcoming events that carry an external sign-up link (SignUpGenius and
 * friends). These are self-serve — peer ministers claim a spot on the
 * provider's page rather than being assigned a slot here.
 */
export async function GET() {
  try {
    const adminSession = await auth();
    const peerSession = await getPeerSession();

    if (!adminSession?.user?.id && !peerSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const opportunities = await db.query.events.findMany({
      where: and(
        isNotNull(events.signupUrl),
        gte(events.eventDate, todayInEastern())
      ),
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
        signupSource: true,
      },
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
