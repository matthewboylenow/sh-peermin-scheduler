import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { slots } from '@/db/schema';
import { z } from 'zod';

const createSlotSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  capacity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

// POST /api/slots - Create slot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSlotSchema.parse(body);

    const [slot] = await db.insert(slots).values({
      eventId: validatedData.eventId,
      name: validatedData.name,
      capacity: validatedData.capacity,
      notes: validatedData.notes || null,
    }).returning();

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    console.error('Error creating slot:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create slot' },
      { status: 500 }
    );
  }
}
