import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { signups } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';
import {
  getAdminSession,
  hasAnySession,
  unauthorized,
} from '@/lib/api-auth';
import { SIGNUP_CATEGORY_VALUES } from '@/lib/signup-categories';

const signupSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z.string().url('Enter a valid link'),
  category: z.enum(SIGNUP_CATEGORY_VALUES).default('peer_ministry'),
  scheduleNote: z.string().max(300).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/signups
 *
 * Standing sign-up links, for admins and peer ministers alike. Admins get the
 * inactive ones too so they can re-enable them.
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await hasAnySession())) {
      return unauthorized();
    }

    const includeInactive =
      request.nextUrl.searchParams.get('includeInactive') === '1' &&
      Boolean(await getAdminSession());

    const rows = await db.query.signups.findMany({
      where: includeInactive ? undefined : eq(signups.isActive, true),
      orderBy: [asc(signups.sortOrder), asc(signups.title)],
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching sign-ups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sign-ups' },
      { status: 500 }
    );
  }
}

/** POST /api/signups - create a sign-up link (admins only). */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }

    const data = signupSchema.parse(await request.json());

    const [created] = await db
      .insert(signups)
      .values({
        title: data.title,
        description: data.description || null,
        url: data.url,
        category: data.category,
        scheduleNote: data.scheduleNote || null,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        createdBy: session.user.id,
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
    console.error('Error creating sign-up:', error);
    return NextResponse.json(
      { error: 'Failed to create sign-up' },
      { status: 500 }
    );
  }
}
