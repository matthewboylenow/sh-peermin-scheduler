import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { slots, assignments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateSlotSchema = z.object({
  name: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
});

// PUT /api/slots/[id] - Update slot
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
    const validatedData = updateSlotSchema.parse(body);

    const [updatedSlot] = await db.update(slots)
      .set(validatedData)
      .where(eq(slots.id, id))
      .returning();

    if (!updatedSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Error updating slot:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update slot' },
      { status: 500 }
    );
  }
}

// DELETE /api/slots/[id] - Delete slot
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

    // Delete assignments first
    await db.delete(assignments).where(eq(assignments.slotId, id));

    // Delete the slot
    const [deletedSlot] = await db.delete(slots)
      .where(eq(slots.id, id))
      .returning();

    if (!deletedSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slot:', error);
    return NextResponse.json(
      { error: 'Failed to delete slot' },
      { status: 500 }
    );
  }
}
