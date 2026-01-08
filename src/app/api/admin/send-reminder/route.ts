import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { assignments, smsLog, smsSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendSMS } from '@/lib/twilio';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';

// Default message template
const DEFAULT_MESSAGE_TEMPLATE = 'Hi {name}! Reminder: You\'re scheduled for "{role}" at {event} on {date} at {time} at {location}. Thank you for serving! - Saint Helen Parish';

// Format time from 24h to 12h format
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Format date to readable format
function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, 'MMMM d, yyyy');
}

// Replace placeholders in template with actual values
function renderTemplate(
  template: string,
  data: {
    name: string;
    role: string;
    event: string;
    date: string;
    time: string;
    location: string;
  }
): string {
  return template
    .replace(/\{name\}/g, data.name)
    .replace(/\{role\}/g, data.role)
    .replace(/\{event\}/g, data.event)
    .replace(/\{date\}/g, data.date)
    .replace(/\{time\}/g, data.time)
    .replace(/\{location\}/g, data.location || 'TBD');
}

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

    // Get the configured message template or use custom message
    let message: string;
    if (validatedData.customMessage) {
      message = validatedData.customMessage;
    } else {
      // Fetch the configured template
      const settings = await db.query.smsSettings.findFirst();
      const template = settings?.messageTemplate || DEFAULT_MESSAGE_TEMPLATE;

      message = renderTemplate(template, {
        name: user.name,
        role: slot.name,
        event: slot.event.title,
        date: formatDate(slot.event.eventDate),
        time: formatTime(slot.event.startTime),
        location: slot.event.location || '',
      });
    }

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
      // Mark as manually reminded (use -1 to indicate manual reminder)
      const currentSentDays: number[] = JSON.parse(assignment.remindersSent || '[]');
      if (!currentSentDays.includes(-1)) {
        const updatedSentDays = [...currentSentDays, -1].sort((a, b) => a - b);
        await db.update(assignments)
          .set({ remindersSent: JSON.stringify(updatedSentDays) })
          .where(eq(assignments.id, assignment.id));
      }

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
