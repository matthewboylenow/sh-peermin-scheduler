import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, slots, assignments } from '@/db/schema';
import { gte, asc } from 'drizzle-orm';

// GET /api/public/schedule - Get public schedule (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get upcoming events
    const upcomingEvents = await db.query.events.findMany({
      where: gte(events.eventDate, today),
      with: {
        slots: {
          with: {
            assignments: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [asc(events.eventDate), asc(events.startTime)],
      limit,
    });

    // Filter by event type if specified
    let filtered = upcomingEvents;
    if (eventType) {
      filtered = upcomingEvents.filter(e => e.eventType === eventType);
    }

    // Transform for public consumption (hide sensitive data)
    const publicEvents = filtered.map(event => ({
      id: event.id,
      title: event.title,
      eventType: event.eventType,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      slots: event.slots.map(slot => ({
        id: slot.id,
        name: slot.name,
        capacity: slot.capacity,
        assignedCount: slot.assignments.length,
        assignees: slot.assignments.map(a => ({
          name: a.user.name,
        })),
      })),
    }));

    return NextResponse.json(publicEvents);
  } catch (error) {
    console.error('Error fetching public schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}
