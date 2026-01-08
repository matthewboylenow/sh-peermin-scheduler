import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, assignments, smsLog } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { sendSMS } from '@/lib/twilio';

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

    // Calculate date range (events happening tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get all assignments for tomorrow's events that haven't received reminders
    const upcomingAssignments = await db.query.assignments.findMany({
      where: eq(assignments.reminderSent, false),
      with: {
        user: true,
        slot: {
          with: {
            event: true,
          },
        },
      },
    });

    // Filter to only tomorrow's events
    const tomorrowAssignments = upcomingAssignments.filter(
      a => a.slot.event.eventDate === tomorrowStr
    );

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const assignment of tomorrowAssignments) {
      const { user, slot } = assignment;

      // Skip if user has notifications disabled or no phone
      if (!user.notificationsEnabled || !user.phone) {
        results.skipped++;
        continue;
      }

      // Format the message
      const message = `Hi ${user.name}! This is a reminder that you're scheduled for "${slot.name}" at ${slot.event.title} tomorrow (${slot.event.eventDate}) at ${slot.event.startTime}${slot.event.location ? ` at ${slot.event.location}` : ''}. Thank you for serving! - Saint Helen Parish`;

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
        results.sent++;
      } else {
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      date: tomorrowStr,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
