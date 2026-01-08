import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events } from '@/db/schema';
import { gte, lte, asc, and } from 'drizzle-orm';

// GET /api/export/schedule - Export schedule as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');

    // Build query conditions
    const conditions = [];
    if (startDate) {
      conditions.push(gte(events.eventDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.eventDate, endDate));
    }

    // Get events with all related data
    const allEvents = await db.query.events.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        slots: {
          with: {
            assignments: {
              with: {
                user: {
                  columns: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [asc(events.eventDate), asc(events.startTime)],
    });

    // Filter by event type if specified
    let filteredEvents = allEvents;
    if (eventType && eventType !== 'all') {
      filteredEvents = allEvents.filter(e => e.eventType === eventType);
    }

    // Build CSV
    const rows: string[][] = [];

    // Header row
    rows.push([
      'Event Date',
      'Event Title',
      'Event Type',
      'Start Time',
      'End Time',
      'Location',
      'Slot Name',
      'Capacity',
      'Assigned',
      'Volunteer Name',
      'Volunteer Phone',
    ]);

    // Data rows
    for (const event of filteredEvents) {
      for (const slot of event.slots) {
        if (slot.assignments.length === 0) {
          // Empty slot
          rows.push([
            event.eventDate,
            event.title,
            event.eventType,
            event.startTime,
            event.endTime || '',
            event.location || '',
            slot.name,
            slot.capacity.toString(),
            '0',
            '',
            '',
          ]);
        } else {
          // Slot with assignments
          for (const assignment of slot.assignments) {
            rows.push([
              event.eventDate,
              event.title,
              event.eventType,
              event.startTime,
              event.endTime || '',
              event.location || '',
              slot.name,
              slot.capacity.toString(),
              slot.assignments.length.toString(),
              assignment.user.name,
              assignment.user.phone || '',
            ]);
          }
        }
      }
    }

    // Convert to CSV string
    const csvContent = rows
      .map(row =>
        row
          .map(cell => {
            // Escape quotes and wrap in quotes if necessary
            if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(',')
      )
      .join('\n');

    // Return as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="schedule-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to export schedule' },
      { status: 500 }
    );
  }
}
