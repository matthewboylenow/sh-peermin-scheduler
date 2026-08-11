import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  forbidden,
  getAdminSession,
  hasAnySession,
  unauthorized,
} from '@/lib/api-auth';
import {
  DEFAULT_SIGNUPS_LAYOUT,
  SIGNUPS_LAYOUTS,
  getAppSettings,
} from '@/lib/app-settings';

const updateSchema = z.object({
  signupsLayout: z.enum(SIGNUPS_LAYOUTS),
});

/**
 * GET /api/app-settings
 *
 * Readable by anyone signed in — the peer minister sign-ups page needs to know
 * which layout to render.
 */
export async function GET() {
  try {
    if (!(await hasAnySession())) {
      return unauthorized();
    }

    const settings = await getAppSettings();
    return NextResponse.json({
      signupsLayout: settings?.signupsLayout ?? DEFAULT_SIGNUPS_LAYOUT,
    });
  } catch (error) {
    console.error('Error fetching app settings:', error);
    // Falling back keeps the sign-ups page usable rather than blank.
    return NextResponse.json({ signupsLayout: DEFAULT_SIGNUPS_LAYOUT });
  }
}

/**
 * PUT /api/app-settings
 *
 * Super admins only. This changes what every peer minister sees, so it sits a
 * rung above the ordinary admin permissions the youth ministry team has.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return unauthorized();
    }
    if (session.user.role !== 'super_admin') {
      return forbidden('Only a super admin can change this setting');
    }

    const { signupsLayout } = updateSchema.parse(await request.json());
    const current = await getAppSettings();

    const [updated] = await db
      .update(appSettings)
      .set({
        signupsLayout,
        updatedAt: new Date(),
        updatedBy: session.user.id,
      })
      .where(eq(appSettings.id, current.id))
      .returning();

    return NextResponse.json({ signupsLayout: updated.signupsLayout });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    console.error('Error updating app settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
