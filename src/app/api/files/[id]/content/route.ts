import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getPeerSession } from '@/lib/peer-session';
import { isViewableInBrowser } from '@/lib/file-kinds';

/**
 * Streams a stored file through our own origin.
 *
 * Serving from the app (rather than linking straight at the blob URL) buys two
 * things: the file is only reachable by a signed-in admin or peer minister,
 * and same-origin responses can be embedded in an <iframe>/<img> for in-browser
 * viewing instead of forcing a download.
 *
 * GET /api/files/:id/content            -> inline (view in browser)
 * GET /api/files/:id/content?download=1 -> attachment (save to device)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminSession = await auth();
    const peerSession = await getPeerSession();

    if (!adminSession?.user?.id && !peerSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const file = await db.query.files.findFirst({ where: eq(files.id, id) });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const forceDownload = request.nextUrl.searchParams.get('download') === '1';
    const canView = isViewableInBrowser(file.fileType, file.name);
    const disposition = forceDownload || !canView ? 'attachment' : 'inline';

    const upstream = await fetch(file.blobUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: 'Failed to load file' },
        { status: 502 }
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', file.fileType || 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeFilename(file.name)}"`
    );
    headers.set('Cache-Control', 'private, max-age=300');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('Error streaming file:', error);
    return NextResponse.json(
      { error: 'Failed to load file' },
      { status: 500 }
    );
  }
}

/** Strip characters that would break the Content-Disposition header. */
function encodeFilename(name: string): string {
  return name.replace(/["\\\r\n]/g, '_');
}
