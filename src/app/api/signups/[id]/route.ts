import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { signups } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession, unauthorized } from '@/lib/api-auth';
import { SIGNUP_CATEGORY_VALUES } from '@/lib/signup-categories';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  url: z.string().url().optional(),
  category: z.enum(SIGNUP_CATEGORY_VALUES).optional(),
  scheduleNote: z.string().max(300).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
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
      .update(signups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(signups.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Sign-up not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    console.error('Error updating sign-up:', error);
    return NextResponse.json(
      { error: 'Failed to update sign-up' },
      { status: 500 }
    );
  }
}

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
    await db.delete(signups).where(eq(signups.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sign-up:', error);
    return NextResponse.json(
      { error: 'Failed to delete sign-up' },
      { status: 500 }
    );
  }
}
