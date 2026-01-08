import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, smsLog, smsSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendSMS } from '@/lib/twilio';
import { format, addDays, parseISO } from 'date-fns';

// Default values if no settings exist
const DEFAULT_REMINDER_DAYS = [1];
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

// POST /api/reminders/send - Send reminders for upcoming events
// This should be called by a cron job (e.g., Vercel Cron)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch SMS settings
    const settings = await db.query.smsSettings.findFirst();
    const reminderDays: number[] = settings
      ? JSON.parse(settings.reminderDays)
      : DEFAULT_REMINDER_DAYS;
    const messageTemplate = settings?.messageTemplate || DEFAULT_MESSAGE_TEMPLATE;

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      byDay: {} as Record<number, { sent: number; failed: number; skipped: number }>,
    };

    // Process each reminder day
    for (const daysAhead of reminderDays) {
      const targetDate = addDays(new Date(), daysAhead);
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      results.byDay[daysAhead] = { sent: 0, failed: 0, skipped: 0 };

      // Get all assignments for events on the target date
      const allAssignments = await db.query.assignments.findMany({
        with: {
          user: true,
          slot: {
            with: {
              event: true,
            },
          },
        },
      });

      // Filter to assignments for target date that haven't received this specific reminder
      const targetAssignments = allAssignments.filter(a => {
        if (a.slot.event.eventDate !== targetDateStr) return false;

        // Check if this reminder day was already sent
        const sentDays: number[] = JSON.parse(a.remindersSent || '[]');
        return !sentDays.includes(daysAhead);
      });

      for (const assignment of targetAssignments) {
        const { user, slot } = assignment;

        // Skip if user has notifications disabled or no phone
        if (!user.notificationsEnabled || !user.phone) {
          results.skipped++;
          results.byDay[daysAhead].skipped++;
          continue;
        }

        // Render the message using the template
        const message = renderTemplate(messageTemplate, {
          name: user.name,
          role: slot.name,
          event: slot.event.title,
          date: formatDate(slot.event.eventDate),
          time: formatTime(slot.event.startTime),
          location: slot.event.location || '',
        });

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
          // Update remindersSent to include this day
          const currentSentDays: number[] = JSON.parse(assignment.remindersSent || '[]');
          const updatedSentDays = [...currentSentDays, daysAhead].sort((a, b) => a - b);

          await db.update(assignments)
            .set({ remindersSent: JSON.stringify(updatedSentDays) })
            .where(eq(assignments.id, assignment.id));

          results.sent++;
          results.byDay[daysAhead].sent++;
        } else {
          results.failed++;
          results.byDay[daysAhead].failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      reminderDays,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
