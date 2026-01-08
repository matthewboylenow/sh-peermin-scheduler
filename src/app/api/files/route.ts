import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { files, folders, type Folder } from '@/db/schema';
import { eq, isNull, desc } from 'drizzle-orm';
import { getPeerSession } from '@/lib/peer-session';

// GET /api/files - List files (accessible to both admins and peer ministers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    // Check for admin or peer session
    const adminSession = await auth();
    const peerSession = await getPeerSession();

    if (!adminSession?.user?.id && !peerSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get folders at this level
    const folderList = await db.query.folders.findMany({
      where: folderId ? eq(folders.parentId, folderId) : isNull(folders.parentId),
      orderBy: [folders.name],
    });

    // Get files at this level
    const fileList = await db.query.files.findMany({
      where: folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      orderBy: [desc(files.createdAt)],
    });

    // Get current folder info if we're in a subfolder
    let currentFolder = null;
    if (folderId) {
      currentFolder = await db.query.folders.findFirst({
        where: eq(folders.id, folderId),
        with: {
          parent: true,
        },
      });
    }

    // Build breadcrumb path
    const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Files' }];
    if (currentFolder) {
      const crumbs: { id: string; name: string }[] = [];
      let currentId: string | null = currentFolder.id;

      // Build breadcrumbs by walking up the folder hierarchy
      while (currentId) {
        const folderRecord: Folder | undefined = await db.query.folders.findFirst({
          where: eq(folders.id, currentId),
        });
        if (folderRecord) {
          crumbs.unshift({ id: folderRecord.id, name: folderRecord.name });
          currentId = folderRecord.parentId;
        } else {
          break;
        }
      }

      breadcrumbs.push(...crumbs);
    }

    return NextResponse.json({
      folders: folderList,
      files: fileList,
      currentFolder,
      breadcrumbs,
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
