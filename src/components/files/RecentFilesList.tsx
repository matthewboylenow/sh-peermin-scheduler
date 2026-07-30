"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { fileDownloadUrl, formatFileSize } from "@/lib/file-kinds";
import { formatTimestamp } from "@/lib/datetime";

export interface RecentFileItem {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  folderName: string | null;
}

/**
 * Compact, previewable file list for dashboards. Clicking a row opens the
 * in-app viewer rather than kicking off a download.
 */
export function RecentFilesList({
  files,
  emptyMessage = "No files have been uploaded yet.",
}: {
  files: RecentFileItem[];
  emptyMessage?: string;
}) {
  const [previewFile, setPreviewFile] = useState<RecentFileItem | null>(null);

  if (files.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">{emptyMessage}</p>
    );
  }

  return (
    <>
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
                <p className="text-sm text-gray-500">
                  {file.folderName ? `${file.folderName} • ` : ""}
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

      <FilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </>
  );
}
