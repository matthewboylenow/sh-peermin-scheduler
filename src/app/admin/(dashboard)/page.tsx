import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, users, files, folders } from "@/db/schema";
import { and, count, desc, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  FileText,
  Folder,
  HandHeart,
  Upload,
  Users,
} from "lucide-react";
import { RecentFilesList } from "@/components/files/RecentFilesList";
import {
  addDaysToDateOnly,
  formatEventDateTime,
  todayInEastern,
} from "@/lib/datetime";

/**
 * Admin dashboard. Files lead, matching the peer minister view — most of the
 * day-to-day work is keeping shared resources current — with scheduling
 * follow-ups underneath.
 */
export default async function AdminDashboardPage() {
  const session = await auth();
  const today = todayInEastern();
  const thirtyDaysFromNow = addDaysToDateOnly(today, 30);

  const [
    upcomingEventsCount,
    activePeerMinistersCount,
    totalFilesCount,
    totalFoldersCount,
    openOpportunitiesCount,
    recentFiles,
    topFolders,
    upcomingEvents,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(events)
      .where(
        and(
          gte(events.eventDate, today),
          lte(events.eventDate, thirtyDaysFromNow)
        )
      )
      .then((rows) => rows[0]?.count || 0),

    db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "peer_minister"), eq(users.isActive, true)))
      .then((rows) => rows[0]?.count || 0),

    db
      .select({ count: count() })
      .from(files)
      .then((rows) => rows[0]?.count || 0),

    db
      .select({ count: count() })
      .from(folders)
      .then((rows) => rows[0]?.count || 0),

    db
      .select({ count: count() })
      .from(events)
      .where(and(isNotNull(events.signupUrl), gte(events.eventDate, today)))
      .then((rows) => rows[0]?.count || 0),

    db.query.files.findMany({
      orderBy: [desc(files.createdAt)],
      limit: 6,
      with: { folder: { columns: { name: true } } },
    }),

    db.query.folders.findMany({
      where: isNull(folders.parentId),
      orderBy: [folders.name],
      limit: 6,
    }),

    db.query.events.findMany({
      where: gte(events.eventDate, today),
      with: { slots: { with: { assignments: true } } },
      orderBy: [events.eventDate, events.startTime],
      limit: 10,
    }),
  ]);

  const eventsWithUnfilledSlots = upcomingEvents.filter((event) =>
    event.slots.some((slot) => slot.assignments.length < slot.capacity)
  );
  const unfilledSlotsCount = eventsWithUnfilledSlots.reduce(
    (total, event) =>
      total +
      event.slots.filter((slot) => slot.assignments.length < slot.capacity)
        .length,
    0
  );

  const nextEvents = upcomingEvents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
          Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening with your peer ministry program.
        </p>
      </div>

      {/* Files */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-navy" />
              Shared Files
            </CardTitle>
            <CardDescription>
              {totalFilesCount} {totalFilesCount === 1 ? "file" : "files"} in{" "}
              {totalFoldersCount}{" "}
              {totalFoldersCount === 1 ? "folder" : "folders"} — visible to
              every peer minister
            </CardDescription>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/files">
              <Upload className="h-4 w-4" />
              Manage Files
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {topFolders.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {topFolders.map((folder) => (
                <Link
                  key={folder.id}
                  href="/admin/files"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 transition-colors hover:border-navy/30 hover:bg-gray-50"
                >
                  <Folder className="h-4 w-4 flex-shrink-0 text-navy" />
                  <span className="truncate text-sm font-medium text-gray-800">
                    {folder.name}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Recently Uploaded
            </h3>
            <RecentFilesList
              files={recentFiles.map((file) => ({
                id: file.id,
                name: file.name,
                fileType: file.fileType,
                fileSize: file.fileSize,
                createdAt:
                  file.createdAt instanceof Date
                    ? file.createdAt.toISOString()
                    : String(file.createdAt),
                folderName: file.folder?.name ?? null,
              }))}
              emptyMessage="No files yet — upload the first one to get started."
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Upcoming Events"
          value={upcomingEventsCount}
          hint="Next 30 days"
          icon={<Calendar className="h-4 w-4 text-gray-400" />}
        />
        <StatCard
          label="Peer Ministers"
          value={activePeerMinistersCount}
          hint="Active"
          icon={<Users className="h-4 w-4 text-gray-400" />}
        />
        <StatCard
          label="Unfilled Slots"
          value={unfilledSlotsCount}
          hint={unfilledSlotsCount > 0 ? "Needs attention" : "All slots filled"}
          icon={
            <AlertCircle
              className={`h-4 w-4 ${unfilledSlotsCount > 0 ? "text-warning" : "text-gray-400"}`}
            />
          }
          valueClassName={
            unfilledSlotsCount > 0 ? "text-warning" : "text-success"
          }
        />
        <StatCard
          label="Open Sign-ups"
          value={openOpportunitiesCount}
          hint="Volunteer opportunities"
          icon={<HandHeart className="h-4 w-4 text-gray-400" />}
        />
      </div>

      {/* Events needing volunteers */}
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
                  (slot) => slot.assignments.length < slot.capacity
                );
                return (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex flex-col gap-1 rounded-lg border border-warning/20 bg-white p-3 transition-colors hover:border-warning/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatEventDateTime(
                          event.eventDate,
                          event.startTime,
                          "short"
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-warning sm:text-right">
                      {unfilledSlots.length === 1
                        ? "1 slot needs filling"
                        : `${unfilledSlots.length} slots need filling`}
                    </p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming events */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Next scheduled events</CardDescription>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/events/new">
              Create Event
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {nextEvents.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>No upcoming events scheduled.</p>
              <p className="mt-1 text-sm">Create events to see them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextEvents.map((event) => {
                const totalSlots = event.slots.reduce(
                  (total, slot) => total + slot.capacity,
                  0
                );
                const filledSlots = event.slots.reduce(
                  (total, slot) => total + slot.assignments.length,
                  0
                );
                return (
                  <Link
                    key={event.id}
                    href={`/admin/events/${event.id}`}
                    className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3 transition-colors hover:border-navy/30 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatEventDateTime(
                          event.eventDate,
                          event.startTime,
                          "weekday"
                        )}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-medium sm:text-right ${
                        filledSlots >= totalSlots
                          ? "text-success"
                          : "text-gray-600"
                      }`}
                    >
                      {filledSlots}/{totalSlots} filled
                    </p>
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

function StatCard({
  label,
  value,
  hint,
  icon,
  valueClassName = "text-navy",
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
        <p className="text-xs text-gray-500">{hint}</p>
      </CardContent>
    </Card>
  );
}
