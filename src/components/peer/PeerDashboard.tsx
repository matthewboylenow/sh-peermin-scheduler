"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Download,
  Folder,
  FolderOpen,
  HandHeart,
  Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import {
  fileDownloadUrl,
  fileViewUrl,
  formatFileSize,
  getFileKind,
} from "@/lib/file-kinds";
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

/** How many of each list the dashboard shows before deferring to a full page. */
const RECENT_FILE_COUNT = 3;
const FOLDER_COUNT = 4;

/**
 * The peer minister landing page.
 *
 * Kept deliberately short: almost everyone opens this on a phone, and the tab
 * bar already covers Files and Sign-Ups. So this screen answers "what do I
 * need right now" — whatever an admin has pinned, open sign-ups, and a few
 * shortcuts — rather than trying to be a full index of everything.
 */
export function PeerDashboard({ firstName }: { firstName: string }) {
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [featured, setFeatured] = useState<RecentFile[]>([]);
  const [folders, setFolders] = useState<TopFolder[]>([]);
  const [openSignups, setOpenSignups] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<RecentFile | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [filesRes, opportunitiesRes, signupsRes] = await Promise.all([
          fetch(`/api/files?recent=${RECENT_FILE_COUNT}`),
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

        // One number for both kinds of sign-up — the teen doesn't care which
        // list a thing came from, only whether there's something to claim.
        const counts = await Promise.all([
          opportunitiesRes.ok ? opportunitiesRes.json() : [],
          signupsRes.ok ? signupsRes.json() : [],
        ]);
        if (!cancelled) {
          setOpenSignups(
            counts.reduce(
              (total, list) => total + (Array.isArray(list) ? list.length : 0),
              0
            )
          );
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

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
        Hi, {firstName}
      </h1>

      {/* Pinned by an admin — usually the ministry calendar. Images render in
          place; anything else gets a card that opens the viewer. */}
      {featured.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-500">
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
                        className="max-h-[60vh] w-full bg-gray-50 object-contain"
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

      {/* Sign-ups: one row rather than a card. The count is the whole message. */}
      {openSignups > 0 && (
        <Link
          href="/my/opportunities"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-rust/10">
            <HandHeart className="h-5 w-5 text-rust" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">Sign-Ups</p>
            <p className="text-sm text-gray-500">
              {openSignups === 1
                ? "1 open sign-up"
                : `${openSignups} open sign-ups`}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
        </Link>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {folders.slice(0, FOLDER_COUNT).map((folder) => (
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
        </section>
      )}

      {/* Recently added files */}
      {files.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Recently Added
          </h2>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white transition-colors hover:bg-gray-50"
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
                    <p className="truncate text-sm text-gray-500">
                      {file.folder ? `${file.folder.name} • ` : ""}
                      {formatFileSize(file.fileSize)}
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
        </section>
      ) : (
        folders.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center">
              <FolderOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-gray-500">Nothing here yet</p>
              <p className="text-sm text-gray-400">
                Ministry resources will appear once they&apos;re added.
              </p>
            </CardContent>
          </Card>
        )
      )}

      <FilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
