import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, slots } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';
import { addDays, addWeeks, addMonths, parseISO, format } from 'date-fns';

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  eventType: z.enum(['mass', 'clow', 'volunteer', 'ministry', 'other']),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  recurrenceType: z.enum(['none', 'daily', 'weekly', 'biweekly', 'monthly']).default('none'),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slots: z.array(z.object({
    name: z.string().min(1),
    capacity: z.number().int().positive().default(1),
    notes: z.string().optional(),
  })).optional(),
});

// GET /api/events - List events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('type');

    const conditions = [];

    if (startDate) {
      conditions.push(gte(events.eventDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.eventDate, endDate));
    }
    if (eventType && eventType !== 'all') {
      conditions.push(eq(events.eventType, eventType as 'mass' | 'clow' | 'volunteer' | 'ministry' | 'other'));
    }

    const result = await db.query.events.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        slots: {
          with: {
            assignments: {
              with: {
                user: true,
              },
            },
          },
        },
        creator: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(events.eventDate)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create event
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    const { slots: eventSlots, recurrenceType, recurrenceEndDate, ...eventData } = validatedData;

    // Generate recurring event dates
    const eventDates: string[] = [eventData.eventDate];

    if (recurrenceType !== 'none' && recurrenceEndDate) {
      const startDate = parseISO(eventData.eventDate);
      const endRecurrence = parseISO(recurrenceEndDate);
      let currentDate = startDate;

      while (currentDate < endRecurrence) {
        switch (recurrenceType) {
          case 'daily':
            currentDate = addDays(currentDate, 1);
            break;
          case 'weekly':
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            currentDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            currentDate = addMonths(currentDate, 1);
            break;
        }
        if (currentDate <= endRecurrence) {
          eventDates.push(format(currentDate, 'yyyy-MM-dd'));
        }
      }
    }

    // Create parent event (first occurrence)
    const [parentEvent] = await db.insert(events).values({
      ...eventData,
      recurrenceType,
      recurrenceEndDate: recurrenceEndDate || null,
      createdBy: session.user.id,
    }).returning();

    // Create slots for parent event
    if (eventSlots && eventSlots.length > 0) {
      await db.insert(slots).values(
        eventSlots.map(slot => ({
          eventId: parentEvent.id,
          name: slot.name,
          capacity: slot.capacity,
          notes: slot.notes || null,
        }))
      );
    }

    // Create child events (recurring instances)
    const childEvents = [];
    if (eventDates.length > 1) {
      for (let i = 1; i < eventDates.length; i++) {
        const [childEvent] = await db.insert(events).values({
          ...eventData,
          eventDate: eventDates[i],
          recurrenceType: 'none',
          parentEventId: parentEvent.id,
          createdBy: session.user.id,
        }).returning();

        childEvents.push(childEvent);

        // Create slots for child event
        if (eventSlots && eventSlots.length > 0) {
          await db.insert(slots).values(
            eventSlots.map(slot => ({
              eventId: childEvent.id,
              name: slot.name,
              capacity: slot.capacity,
              notes: slot.notes || null,
            }))
          );
        }
      }
    }

    return NextResponse.json({
      event: parentEvent,
      childEvents,
      totalCreated: 1 + childEvents.length,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
