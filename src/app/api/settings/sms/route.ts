import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { smsSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Default values for SMS settings
const DEFAULT_REMINDER_DAYS = [1];
const DEFAULT_MESSAGE_TEMPLATE = 'Hi {name}! Reminder: You\'re scheduled for "{role}" at {event} on {date} at {time} at {location}. Thank you for serving! - Saint Helen Parish';

const updateSmsSettingsSchema = z.object({
  reminderDays: z.array(z.number().int().min(1).max(30))
    .min(1, 'Select at least one reminder day')
    .max(5, 'Maximum 5 reminder days allowed')
    .refine(arr => new Set(arr).size === arr.length, 'No duplicate days')
    .optional(),
  messageTemplate: z.string()
    .min(10, 'Template too short')
    .max(500, 'Template too long')
    .refine(t => t.includes('{name}'), 'Template must include {name} placeholder')
    .optional(),
});

// GET /api/settings/sms - Get current SMS settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view SMS settings
    if (!['admin', 'super_admin'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the settings (should be a single row)
    const settings = await db.query.smsSettings.findFirst();

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        reminderDays: DEFAULT_REMINDER_DAYS,
        messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
      });
    }

    return NextResponse.json({
      reminderDays: JSON.parse(settings.reminderDays),
      messageTemplate: settings.messageTemplate,
    });
  } catch (error) {
    console.error('Error fetching SMS settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/sms - Update SMS settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update SMS settings
    if (!['admin', 'super_admin'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateSmsSettingsSchema.parse(body);

    // Check if settings exist
    const existingSettings = await db.query.smsSettings.findFirst();

    if (existingSettings) {
      // Update existing settings
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: session.user.id,
      };

      if (validatedData.reminderDays) {
        updateData.reminderDays = JSON.stringify(validatedData.reminderDays.sort((a, b) => a - b));
      }
      if (validatedData.messageTemplate) {
        updateData.messageTemplate = validatedData.messageTemplate;
      }

      await db.update(smsSettings)
        .set(updateData)
        .where(eq(smsSettings.id, existingSettings.id));

      const updated = await db.query.smsSettings.findFirst();
      return NextResponse.json({
        reminderDays: JSON.parse(updated!.reminderDays),
        messageTemplate: updated!.messageTemplate,
      });
    } else {
      // Create new settings row
      const [created] = await db.insert(smsSettings).values({
        reminderDays: JSON.stringify(validatedData.reminderDays?.sort((a, b) => a - b) || DEFAULT_REMINDER_DAYS),
        messageTemplate: validatedData.messageTemplate || DEFAULT_MESSAGE_TEMPLATE,
        updatedBy: session.user.id,
      }).returning();

      return NextResponse.json({
        reminderDays: JSON.parse(created.reminderDays),
        messageTemplate: created.messageTemplate,
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update SMS settings' },
      { status: 500 }
    );
  }
}
