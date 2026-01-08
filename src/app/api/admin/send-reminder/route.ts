import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { assignments, smsLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendSMS } from '@/lib/twilio';
import { z } from 'zod';

const sendReminderSchema = z.object({
  assignmentId: z.string().uuid(),
  customMessage: z.string().optional(),
});

// POST /api/admin/send-reminder - Manually send a reminder for an assignment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = sendReminderSchema.parse(body);

    // Get the assignment with related data
    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, validatedData.assignmentId),
      with: {
        user: true,
        slot: {
          with: {
            event: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const { user, slot } = assignment;

    if (!user.phone) {
      return NextResponse.json(
        { error: 'User has no phone number' },
        { status: 400 }
      );
    }

    // Format the message
    const message = validatedData.customMessage ||
      `Hi ${user.name}! This is a reminder that you're scheduled for "${slot.name}" at ${slot.event.title} on ${slot.event.eventDate} at ${slot.event.startTime}${slot.event.location ? ` at ${slot.event.location}` : ''}. Thank you for serving! - Saint Helen Parish`;

    // Send SMS
    const twilioSid = await sendSMS(user.phone, message);

    // Log the SMS
    await db.insert(smsLog).values({
      userId: user.id,
      phone: user.phone,
      messageType: 'reminder',
      messageBody: message,
      twilioSid,
      status: twilioSid ? 'sent' : 'failed',
    });

    if (twilioSid) {
      // Mark reminder as sent
      await db.update(assignments)
        .set({ reminderSent: true })
        .where(eq(assignments.id, assignment.id));

      return NextResponse.json({
        success: true,
        message: 'Reminder sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send SMS' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    );
  }
}
