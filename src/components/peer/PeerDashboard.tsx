"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Folder,
  FolderOpen,
  HandHeart,
  MapPin,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import {
  fileDownloadUrl,
  fileViewUrl,
  formatFileSize,
  getFileKind,
  isViewableInBrowser,
} from "@/lib/file-kinds";
import {
  formatTimeRange,
  formatTimestamp,
  relativeEventDate,
  todayInEastern,
} from "@/lib/datetime";

interface RecentFile {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  folder: { id: string; name: string } | null;
}

interface TopFolder {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  slot: {
    id: string;
    name: string;
    event: {
      id: string;
      title: string;
      eventDate: string;
      startTime: string;
      endTime: string | null;
      location: string | null;
    };
  };
}

interface Opportunity {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  signupUrl: string;
}

/**
 * The peer minister landing page. Files come first — that's what people open
 * the app for day to day — with a compact reminder of the next assignment and
 * any open volunteer sign-ups underneath.
 */
export function PeerDashboard({ firstName }: { firstName: string }) {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [featured, setFeatured] = useState<RecentFile[]>([]);
  const [folders, setFolders] = useState<TopFolder[]>([]);
  const [nextAssignment, setNextAssignment] = useState<Assignment | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [signupCount, setSignupCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<RecentFile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [filesRes, assignmentsRes, opportunitiesRes, signupsRes] =
          await Promise.all([
            fetch("/api/files?recent=6"),
            fetch("/api/assignments"),
            fetch("/api/opportunities"),
            fetch("/api/signups"),
          ]);

        if (cancelled) return;

        if (filesRes.ok) {
          const data = await filesRes.json();
          setFiles(data.files ?? []);
          setFolders(data.folders ?? []);
          setFeatured(data.featured ?? []);
        }

        if (signupsRes.ok) {
          const data = await signupsRes.json();
          setSignupCount(Array.isArray(data) ? data.length : 0);
        }

        if (assignmentsRes.ok) {
          const data: Assignment[] = await assignmentsRes.json();
          const today = todayInEastern();
          const upcoming = data
            .filter((item) => item.slot.event.eventDate >= today)
            .sort((a, b) =>
              a.slot.event.eventDate.localeCompare(b.slot.event.eventDate)
            );
          setNextAssignment(upcoming[0] ?? null);
        }

        if (opportunitiesRes.ok) {
          setOpportunities(await opportunitiesRes.json());
        }
      } catch (error) {
        console.error("Error loading dashboard:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const openSignups = opportunities.length + signupCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
          Hi, {firstName}
        </h1>
        <p className="text-gray-500">Your ministry files and resources</p>
      </div>

      {/* Pinned by an admin — the ministry calendar usually lives here, so it
          sits above everything else. Images render in place; anything else
          gets a card that opens the viewer. */}
      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <Pin className="h-4 w-4" />
            Pinned
          </h2>
          <div className="space-y-3">
            {featured.map((file) => {
              const isImage = getFileKind(file.fileType, file.name) === "image";
              return (
                <Card key={file.id} className="overflow-hidden">
                  {isImage ? (
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="block w-full text-left"
                      aria-label={`Open ${file.name}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileViewUrl(file.id)}
                        alt={file.name}
                        // Capped so a tall portrait calendar doesn't push the
                        // rest of the dashboard off the bottom of a phone.
                        className="max-h-[65vh] w-full bg-gray-50 object-contain"
                      />
                      <div className="flex items-center justify-between gap-3 border-t border-gray-200 p-3">
                        <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                          {file.name}
                        </span>
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          Tap to enlarge
                        </span>
                      </div>
                    </button>
                  ) : (
                    <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <FileIcon
                          fileType={file.fileType}
                          fileName={file.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.fileSize)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setPreviewFile(file)}
                        className="flex-shrink-0"
                      >
                        Open
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Folders */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Folders
          </h2>
          <Link
            href="/my/files"
            className="flex items-center gap-1 text-sm font-medium text-navy hover:underline"
          >
            Browse all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {folders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FolderOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500">No folders yet</p>
              <p className="text-sm text-gray-400">
                Ministry resources will appear here once they&apos;re added.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {folders.slice(0, 6).map((folder) => (
              <Link
                key={folder.id}
                href={`/my/files?folder=${folder.id}`}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy/10">
                  <Folder className="h-5 w-5 text-navy" />
                </div>
                <span className="truncate text-sm font-medium text-gray-900">
                  {folder.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recently added files */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Recently Added
        </h2>
        <Card>
          <CardContent className="p-3 sm:p-4">
            {files.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                No files have been shared yet.
              </p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 transition-colors hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <FileIcon fileType={file.fileType} fileName={file.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {file.name}
                        </p>
                        {/* Wraps rather than truncates: the upload date is
                            worth more than a single tidy line on a phone. */}
                        <p className="text-sm text-gray-500">
                          {file.folder ? `${file.folder.name} • ` : ""}
                          {formatFileSize(file.fileSize)} •{" "}
                          {formatTimestamp(file.createdAt)}
                        </p>
                      </div>
                    </button>
                    <div className="flex flex-shrink-0 items-center pr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        aria-label={`Download ${file.name}`}
                      >
                        <a href={fileDownloadUrl(file.id)}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {files.some((file) => isViewableInBrowser(file.fileType, file.name)) && (
          <p className="mt-2 text-xs text-gray-400">
            Tap a file to read it here, or use the download button to save it.
          </p>
        )}
      </section>

      {/* Next assignment */}
      {nextAssignment && (
        <Card className="border-2 border-navy bg-navy/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-navy">
              <Calendar className="h-5 w-5" />
              {relativeEventDate(nextAssignment.slot.event.eventDate) ===
              "Today"
                ? "Coming up today"
                : "Next assignment"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-gray-900">
              {nextAssignment.slot.event.title}
            </p>
            <p className="text-sm font-medium text-navy">
              {nextAssignment.slot.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {relativeEventDate(nextAssignment.slot.event.eventDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTimeRange(
                  nextAssignment.slot.event.startTime,
                  nextAssignment.slot.event.endTime
                )}
              </span>
              {nextAssignment.slot.event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {nextAssignment.slot.event.location}
                </span>
              )}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/my/schedule">
                View full schedule
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sign-ups — both the dated opportunities and the standing links */}
      {openSignups > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HandHeart className="h-5 w-5 text-rust" />
              Sign-Ups
              <Badge variant="secondary">{openSignups}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-gray-600">
              {openSignups === 1
                ? "There's an open sign-up waiting for volunteers."
                : `There are ${openSignups} open sign-ups waiting for volunteers.`}
            </p>
            <Button asChild size="sm">
              <Link href="/my/opportunities">
                See sign-ups
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <FilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
