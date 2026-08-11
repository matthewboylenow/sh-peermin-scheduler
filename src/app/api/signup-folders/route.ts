import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { signupFolders } from '@/db/schema';
import { asc } from 'drizzle-orm';
import {
  getAdminSession,
  hasAnySession,
  unauthorized,
} from '@/lib/api-auth';

const folderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

/** GET /api/signup-folders - folders for grouping sign-up links. */
export async function GET() {
  try {
    if (!(await hasAnySession())) {
      return unauthorized();
    }

    const rows = await db.query.signupFolders.findMany({
      orderBy: [asc(signupFolders.sortOrder), asc(signupFolders.name)],
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching sign-up folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

/** POST /api/signup-folders - create a folder (admins only). */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }

    const data = folderSchema.parse(await request.json());

    const [created] = await db
      .insert(signupFolders)
      .values({
        name: data.name,
        description: data.description || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    console.error('Error creating sign-up folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
