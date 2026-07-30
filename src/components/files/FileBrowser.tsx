"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Download, Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { fileDownloadUrl, formatFileSize } from "@/lib/file-kinds";
import { formatTimestamp } from "@/lib/datetime";

export interface BrowserFile {
  id: string;
  name: string;
  blobUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

export interface BrowserFolder {
  id: string;
  name: string;
  createdAt: string;
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

interface FileBrowserProps {
  /** Folder to open on mount, e.g. from a `?folder=` deep link. */
  initialFolderId?: string | null;
  /** Bump to force a refetch (e.g. after an upload or delete). */
  reloadToken?: number;
  /** Notified whenever the user moves into a different folder. */
  onNavigate?: (folderId: string | null) => void;
  /** Extra per-row controls, e.g. rename/delete for admins. */
  folderActions?: (folder: BrowserFolder) => ReactNode;
  fileActions?: (file: BrowserFile) => ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
}

/**
 * Folder-and-file browser shared by the peer minister portal and the admin
 * file manager. Tapping a file opens it in the in-app viewer; anything the
 * browser can't render falls back to a download.
 */
export function FileBrowser({
  initialFolderId = null,
  reloadToken = 0,
  onNavigate,
  folderActions,
  fileActions,
  emptyTitle = "Nothing here yet",
  emptyHint = "Check back later for ministry resources.",
}: FileBrowserProps) {
  const [folders, setFolders] = useState<BrowserFolder[]>([]);
  const [files, setFiles] = useState<BrowserFile[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(
    initialFolderId
  );
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<BrowserFile | null>(null);

  const fetchContents = useCallback(async (folderId: string | null) => {
    try {
      setIsLoading(true);
      const url = folderId ? `/api/files?folderId=${folderId}` : "/api/files";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders);
        setFiles(data.files);
        setBreadcrumbs(data.breadcrumbs);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId, reloadToken, fetchContents]);

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    onNavigate?.(folderId);
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center text-sm text-gray-500">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id ?? "root"} className="flex items-center">
            {index > 0 && <ChevronRight className="mx-1 h-4 w-4 flex-shrink-0" />}
            <button
              type="button"
              onClick={() => navigateToFolder(crumb.id)}
              className={`min-h-[32px] transition-colors hover:text-navy ${
                index === breadcrumbs.length - 1
                  ? "font-medium text-gray-900"
                  : ""
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </nav>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">
              {breadcrumbs[breadcrumbs.length - 1]?.name || "Files"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <div className="py-12 text-center">
              <Folder className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">{emptyTitle}</p>
              <p className="text-sm text-gray-400">{emptyHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 transition-colors hover:bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => navigateToFolder(folder.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy/10">
                      <Folder className="h-5 w-5 text-navy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-900">
                        {folder.name}
                      </p>
                      <p className="text-sm text-gray-500">Folder</p>
                    </div>
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  </button>
                  {folderActions && (
                    <div className="flex flex-shrink-0 items-center gap-1 pr-2">
                      {folderActions(folder)}
                    </div>
                  )}
                </div>
              ))}

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
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.fileSize)} •{" "}
                          {formatTimestamp(file.createdAt)}
                        </p>
                      </div>
                    </button>
                    {/* No separate "view" button: the row itself opens the
                        preview, and on a phone every icon here costs
                        characters off the filename. */}
                    <div className="flex flex-shrink-0 items-center gap-1 pr-2">
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
                      {fileActions?.(file)}
                    </div>
                  </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
