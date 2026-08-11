import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { signupFolders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession, unauthorized } from '@/lib/api-auth';

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }

    const { id } = await params;
    const data = updateSchema.parse(await request.json());

    const [updated] = await db
      .update(signupFolders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(signupFolders.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    console.error('Error updating sign-up folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/signup-folders/:id
 *
 * The sign-ups inside survive — the foreign key nulls their folder, so they
 * fall back to the top level rather than disappearing with the folder.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }

    const { id } = await params;
    await db.delete(signupFolders).where(eq(signupFolders.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sign-up folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
