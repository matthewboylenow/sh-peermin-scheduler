import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { files } from '@/db/schema';
import { validateUpload } from '@/lib/upload-limits';

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  blobUrl: z.string().url(),
  fileType: z.string().max(255),
  fileSize: z.number().int().positive(),
  folderId: z.string().uuid().nullable().optional(),
});

/** Public Vercel Blob URLs always live on this domain. */
function isBlobUrl(rawUrl: string): boolean {
  try {
    const { hostname, protocol } = new URL(rawUrl);
    return protocol === 'https:' && hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/**
 * POST /api/files/register
 *
 * Records a file that the browser has just uploaded straight to Blob storage.
 * The upload itself bypasses this app (see /api/files/upload), so this is where
 * the row gets written and the limits get checked a second time — the browser's
 * own check is a convenience, not a guarantee.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = registerSchema.parse(body);

    // Only accept URLs from our own Blob store, so this can't be used to
    // point a file record at an arbitrary address.
    if (!isBlobUrl(data.blobUrl)) {
      return NextResponse.json(
        { error: 'Invalid upload URL' },
        { status: 400 }
      );
    }

    const check = validateUpload(data.name, data.fileType, data.fileSize);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const [savedFile] = await db
      .insert(files)
      .values({
        name: data.name,
        blobUrl: data.blobUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        folderId: data.folderId || null,
        uploadedBy: session.user.id,
      })
      .returning();

    return NextResponse.json(savedFile, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    console.error('Error registering file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
