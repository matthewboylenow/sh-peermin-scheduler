import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/auth';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// DELETE /api/files/[id] - Delete a file
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

    // Get file info
    const file = await db.query.files.findFirst({
      where: eq(files.id, id),
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(file.blobUrl);
    } catch (blobError) {
      console.error('Error deleting from blob storage:', blobError);
      // Continue even if blob deletion fails
    }

    // Delete from database
    await db.delete(files).where(eq(files.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}

const patchSchema = z.object({
  isFeatured: z.boolean(),
});

/**
 * PATCH /api/files/[id]
 *
 * Currently only toggles the dashboard pin. Used for the parish calendar, so
 * peer ministers see it without digging through folders.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { isFeatured } = patchSchema.parse(await request.json());

    const [updated] = await db
      .update(files)
      .set({ isFeatured })
      .where(eq(files.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Error updating file:', error);
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    );
  }
}
