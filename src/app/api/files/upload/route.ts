import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/auth';
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  getUploadType,
} from '@/lib/upload-limits';

/**
 * Issues a short-lived token so the browser can upload straight to Vercel Blob.
 *
 * The file never passes through this function, which is the point: a Vercel
 * function's request body is capped at ~4.5 MB, so routing a 20 MB PDF through
 * it fails outright. Going browser → Blob sidesteps that entirely, and Blob
 * enforces the type and size limits we set here before accepting a byte.
 *
 * The database row is created afterwards by /api/files/register.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error('Not authenticated');
        }

        // Per-type ceiling, derived from the extension Blob will actually
        // store it under — not from anything the client claims.
        const uploadType = getUploadType(pathname);
        if (!uploadType) {
          throw new Error('That file type is not allowed');
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: Math.min(uploadType.maxBytes, MAX_UPLOAD_BYTES),
          // Two files named "Handbook.pdf" must not collide; without this the
          // second upload fails rather than sitting alongside the first.
          addRandomSuffix: true,
        };
      },
      // The DB row is written by /api/files/register instead of here, so that
      // uploads also work on localhost (Blob can't call back to a machine it
      // can't reach).
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Error issuing upload token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}
