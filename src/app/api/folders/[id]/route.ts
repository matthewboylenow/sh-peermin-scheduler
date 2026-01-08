import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/auth';
import { db } from '@/db';
import { folders, files } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
});

// PUT /api/folders/[id] - Update folder name
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
    const validatedData = updateFolderSchema.parse(body);

    const [folder] = await db.update(folders)
      .set({
        name: validatedData.name,
        updatedAt: new Date(),
      })
      .where(eq(folders.id, id))
      .returning();

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[id] - Delete folder and all contents
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

    // Get folder info
    const folder = await db.query.folders.findFirst({
      where: eq(folders.id, id),
      with: {
        files: true,
        children: {
          with: {
            files: true,
          },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Delete files in this folder from Vercel Blob
    for (const file of folder.files) {
      try {
        await del(file.blobUrl);
      } catch (blobError) {
        console.error('Error deleting file from blob storage:', blobError);
      }
    }

    // Delete files in child folders from Vercel Blob
    for (const childFolder of folder.children) {
      for (const file of childFolder.files) {
        try {
          await del(file.blobUrl);
        } catch (blobError) {
          console.error('Error deleting file from blob storage:', blobError);
        }
      }
    }

    // Delete the folder (cascade will delete files and children)
    await db.delete(folders).where(eq(folders.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
