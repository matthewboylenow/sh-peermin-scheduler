import { auth } from "@/auth";
import { db } from "@/db";
import { events, users, files } from "@/db/schema";
import { eq, gte, lte, and, count } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, Users, FileText, Bell, Plus, ArrowRight, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";

export default async function AdminDashboardPage() {
  const session = await auth();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = format(addDays(new Date(), 30), 'yyyy-MM-dd');

  // Get stats in parallel
  const [
    upcomingEventsCount,
    activePeerMinistersCount,
    totalFilesCount,
    upcomingEvents,
  ] = await Promise.all([
    // Count upcoming events (next 30 days)
    db.select({ count: count() })
      .from(events)
      .where(and(
        gte(events.eventDate, today),
        lte(events.eventDate, thirtyDaysFromNow)
      ))
      .then(r => r[0]?.count || 0),

    // Count active peer ministers
    db.select({ count: count() })
      .from(users)
      .where(and(
        eq(users.role, 'peer_minister'),
        eq(users.isActive, true)
      ))
      .then(r => r[0]?.count || 0),

    // Count files
    db.select({ count: count() })
      .from(files)
      .then(r => r[0]?.count || 0),

    // Get upcoming events with unfilled slots
    db.query.events.findMany({
      where: gte(events.eventDate, today),
      with: {
        slots: {
          with: {
            assignments: true,
          },
        },
      },
      orderBy: [events.eventDate, events.startTime],
      limit: 10,
    }),
  ]);

  // Calculate unfilled slots
  const eventsWithUnfilledSlots = upcomingEvents.filter(event =>
    event.slots.some(slot => slot.assignments.length < slot.capacity)
  );
  const unfilledSlotsCount = eventsWithUnfilledSlots.reduce((acc, event) =>
    acc + event.slots.filter(slot => slot.assignments.length < slot.capacity).length,
    0
  );

  // Get next few events with details
  const nextEvents = upcomingEvents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-navy">
          Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s what&apos;s happening with your peer ministry program.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Upcoming Events
            </CardTitle>
            <Calendar className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">{upcomingEventsCount}</div>
            <p className="text-xs text-gray-500">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Active Peer Ministers
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">{activePeerMinistersCount}</div>
            <p className="text-xs text-gray-500">Total registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Unfilled Slots
            </CardTitle>
            <Bell className={`h-4 w-4 ${unfilledSlotsCount > 0 ? 'text-warning' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${unfilledSlotsCount > 0 ? 'text-warning' : 'text-success'}`}>
              {unfilledSlotsCount}
            </div>
            <p className="text-xs text-gray-500">
              {unfilledSlotsCount > 0 ? 'Needs attention' : 'All slots filled!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Shared Files
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-navy">{totalFilesCount}</div>
            <p className="text-xs text-gray-500">Documents uploaded</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-card-hover hover:-translate-y-1 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-rust" />
              Create Event
            </CardTitle>
            <CardDescription>
              Add a new event to the schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full group">
              <Link href="/admin/events/new">
                Create Event
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-card-hover hover:-translate-y-1 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-navy" />
              Add Peer Minister
            </CardTitle>
            <CardDescription>
              Invite a new peer minister to the program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full group">
              <Link href="/admin/people/new">
                Add Person
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-card-hover hover:-translate-y-1 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-success" />
              View Schedule
            </CardTitle>
            <CardDescription>
              See the full ministry schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full group">
              <Link href="/admin/schedule">
                Open Schedule
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events with Unfilled Slots */}
      {eventsWithUnfilledSlots.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Events Needing Volunteers
            </CardTitle>
            <CardDescription>
              These upcoming events have unfilled volunteer slots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventsWithUnfilledSlots.slice(0, 5).map((event) => {
                const unfilledSlots = event.slots.filter(
                  slot => slot.assignments.length < slot.capacity
                );
                return (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-warning/20 hover:border-warning/40 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.eventDate), 'MMM d')} at {event.startTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-warning">
                        {unfilledSlots.length} slots need filling
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>
            Next scheduled events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nextEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No upcoming events scheduled.</p>
              <p className="text-sm mt-1">Create events to see them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextEvents.map((event) => {
                const totalSlots = event.slots.reduce((acc, s) => acc + s.capacity, 0);
                const filledSlots = event.slots.reduce((acc, s) => acc + s.assignments.length, 0);
                return (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-navy/30 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.eventDate), 'EEEE, MMM d')} at {event.startTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${filledSlots >= totalSlots ? 'text-success' : 'text-gray-600'}`}>
                        {filledSlots}/{totalSlots} filled
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
