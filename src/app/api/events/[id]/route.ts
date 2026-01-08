import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, slots, assignments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  eventType: z.enum(['mass', 'clow', 'volunteer', 'ministry', 'other']).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  location: z.string().optional().nullable(),
  updateFutureInstances: z.boolean().optional(),
});

// GET /api/events/[id] - Get single event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        slots: {
          with: {
            assignments: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    phone: true,
                  },
                },
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
        childEvents: {
          columns: {
            id: true,
            eventDate: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

// PUT /api/events/[id] - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    const { updateFutureInstances, ...updateData } = validatedData;

    // Update the event
    const [updatedEvent] = await db.update(events)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id))
      .returning();

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Optionally update future instances
    if (updateFutureInstances && updatedEvent.recurrenceType !== 'none') {
      const childEventsResult = await db.query.events.findMany({
        where: eq(events.parentEventId, id),
      });

      for (const child of childEventsResult) {
        await db.update(events)
          .set({
            title: updateData.title,
            description: updateData.description,
            eventType: updateData.eventType,
            startTime: updateData.startTime,
            endTime: updateData.endTime,
            location: updateData.location,
            updatedAt: new Date(),
          })
          .where(eq(events.id, child.id));
      }
    }

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteFutureInstances = searchParams.get('deleteFutureInstances') === 'true';

    // Get the event first
    const event = await db.query.events.findFirst({
      where: eq(events.id, id),
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete future instances if requested
    if (deleteFutureInstances) {
      // Get all child events
      const childEvents = await db.query.events.findMany({
        where: eq(events.parentEventId, id),
      });

      // Delete slots and assignments for child events (cascade should handle this)
      for (const child of childEvents) {
        const childSlots = await db.query.slots.findMany({
          where: eq(slots.eventId, child.id),
        });
        for (const slot of childSlots) {
          await db.delete(assignments).where(eq(assignments.slotId, slot.id));
        }
        await db.delete(slots).where(eq(slots.eventId, child.id));
        await db.delete(events).where(eq(events.id, child.id));
      }
    }

    // Delete the main event's slots and assignments
    const eventSlots = await db.query.slots.findMany({
      where: eq(slots.eventId, id),
    });
    for (const slot of eventSlots) {
      await db.delete(assignments).where(eq(assignments.slotId, slot.id));
    }
    await db.delete(slots).where(eq(slots.eventId, id));

    // Delete the event
    await db.delete(events).where(eq(events.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
