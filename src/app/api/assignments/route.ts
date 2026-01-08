import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { assignments, slots, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getPeerSession } from '@/lib/peer-session';

const createAssignmentSchema = z.object({
  slotId: z.string().uuid(),
  userId: z.string().uuid(),
  notes: z.string().optional(),
});

// GET /api/assignments - List assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Check for admin or peer session
    const adminSession = await auth();
    const peerSession = await getPeerSession();

    // If peer minister is logged in, only show their assignments
    if (peerSession && !adminSession) {
      userId = peerSession.userId;
    }

    // Build query based on filters
    const result = await db.query.assignments.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            phone: true,
          },
        },
        slot: {
          with: {
            event: {
              columns: {
                id: true,
                title: true,
                eventType: true,
                eventDate: true,
                startTime: true,
                endTime: true,
                location: true,
              },
            },
          },
        },
      },
    });

    // Filter results
    let filtered = result;

    if (userId) {
      filtered = filtered.filter(a => a.userId === userId);
    }

    if (eventId) {
      filtered = filtered.filter(a => a.slot.event.id === eventId);
    }

    if (startDate) {
      filtered = filtered.filter(a => a.slot.event.eventDate >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(a => a.slot.event.eventDate <= endDate);
    }

    // Sort by event date
    filtered.sort((a, b) =>
      a.slot.event.eventDate.localeCompare(b.slot.event.eventDate)
    );

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST /api/assignments - Create assignment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createAssignmentSchema.parse(body);

    // Check if slot exists
    const slot = await db.query.slots.findFirst({
      where: eq(slots.id, validatedData.slotId),
      with: {
        event: true,
        assignments: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, validatedData.userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already assigned to this slot
    const existingAssignment = slot.assignments.find(
      a => a.userId === validatedData.userId
    );

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this slot' },
        { status: 400 }
      );
    }

    // Check for double-booking on the same date/time
    const userAssignments = await db.query.assignments.findMany({
      where: eq(assignments.userId, validatedData.userId),
      with: {
        slot: {
          with: {
            event: true,
          },
        },
      },
    });

    const doubleBooked = userAssignments.some(a => {
      const existingEvent = a.slot.event;
      return (
        existingEvent.eventDate === slot.event.eventDate &&
        existingEvent.startTime === slot.event.startTime &&
        existingEvent.id !== slot.event.id
      );
    });

    // Create the assignment (allow with warning)
    const [assignment] = await db.insert(assignments).values({
      slotId: validatedData.slotId,
      userId: validatedData.userId,
      notes: validatedData.notes || null,
      createdBy: session.user.id,
    }).returning();

    // Fetch the complete assignment with relations
    const completeAssignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, assignment.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            phone: true,
          },
        },
        slot: {
          with: {
            event: {
              columns: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      assignment: completeAssignment,
      warnings: doubleBooked ? ['User may be double-booked at this time'] : [],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
