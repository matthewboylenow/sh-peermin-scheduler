import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/export/people - Export peer ministers as CSV
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all peer ministers
    const peerMinisters = await db.query.users.findMany({
      where: eq(users.role, 'peer_minister'),
      with: {
        assignments: {
          with: {
            slot: {
              with: {
                event: true,
              },
            },
          },
        },
      },
      orderBy: [asc(users.name)],
    });

    // Build CSV
    const rows: string[][] = [];

    // Header row
    rows.push([
      'Name',
      'Phone',
      'Status',
      'Notifications Enabled',
      'Total Assignments',
      'Upcoming Assignments',
      'Created Date',
    ]);

    const today = new Date().toISOString().split('T')[0];

    // Data rows
    for (const person of peerMinisters) {
      const upcomingCount = person.assignments.filter(
        a => a.slot.event.eventDate >= today
      ).length;

      rows.push([
        person.name,
        person.phone,
        person.isActive ? 'Active' : 'Inactive',
        person.notificationsEnabled ? 'Yes' : 'No',
        person.assignments.length.toString(),
        upcomingCount.toString(),
        person.createdAt.toISOString().split('T')[0],
      ]);
    }

    // Convert to CSV string
    const csvContent = rows
      .map(row =>
        row
          .map(cell => {
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
        'Content-Disposition': `attachment; filename="peer-ministers-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting people:', error);
    return NextResponse.json(
      { error: 'Failed to export people' },
      { status: 500 }
    );
  }
}
