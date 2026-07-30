"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Download, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@/components/files/FileIcon";
import {
  fileDownloadUrl,
  fileViewUrl,
  formatFileSize,
  getFileKind,
} from "@/lib/file-kinds";

export interface PreviewableFile {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
}

interface FilePreviewDialogProps {
  file: PreviewableFile | null;
  onClose: () => void;
}

/**
 * Full-screen viewer for shared files.
 *
 * PDFs, images, video, audio, and plain text render in place. Everything else
 * (Word, Excel, PowerPoint, archives) gets a download card, since browsers
 * can't display those natively.
 */
export function FilePreviewDialog({ file, onClose }: FilePreviewDialogProps) {
  return (
    <DialogPrimitive.Root
      open={!!file}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-4 sm:rounded-xl sm:shadow-lg overflow-hidden focus:outline-none">
          {file && (
            <>
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <FileIcon fileType={file.fileType} fileName={file.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="truncate text-sm font-medium text-gray-900 sm:text-base">
                    {file.name}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-xs text-gray-500">
                    {formatFileSize(file.fileSize)}
                  </DialogPrimitive.Description>
                </div>
                <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                  <a href={fileDownloadUrl(file.id)}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close preview">
                    <X className="h-5 w-5" />
                  </Button>
                </DialogPrimitive.Close>
              </div>

              <div className="flex-1 overflow-auto bg-gray-50">
                <PreviewBody file={file} />
              </div>

              {/* On phones the header is tight, so repeat the download action. */}
              <div className="border-t border-gray-200 p-3 sm:hidden">
                <Button asChild className="w-full">
                  <a href={fileDownloadUrl(file.id)}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PreviewBody({ file }: { file: PreviewableFile }) {
  const kind = getFileKind(file.fileType, file.name);
  const viewUrl = fileViewUrl(file.id);
  const isSmallScreen = useIsSmallScreen();

  switch (kind) {
    case "pdf":
      // iOS Safari renders only the first page of an embedded PDF and won't
      // scroll it, so on phones we hand off to the native viewer instead.
      return isSmallScreen ? (
        <OpenExternally
          file={file}
          message="Tap below to open this PDF in your browser's built-in reader."
        />
      ) : (
        <iframe
          src={viewUrl}
          title={file.name}
          className="h-full w-full border-0 bg-white"
        />
      );

    case "image":
      return (
        <div className="flex min-h-full items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewUrl}
            alt={file.name}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      );

    case "video":
      return (
        <div className="flex min-h-full items-center justify-center bg-black p-2">
          <video src={viewUrl} controls playsInline className="max-h-full w-full" />
        </div>
      );

    case "audio":
      return (
        <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6">
          <FileIcon
            fileType={file.fileType}
            fileName={file.name}
            className="h-12 w-12"
          />
          <audio src={viewUrl} controls className="w-full max-w-md" />
        </div>
      );

    case "text":
      return <TextPreview url={viewUrl} />;

    default:
      return (
        <OpenExternally
          file={file}
          message="This file type can't be previewed in the browser. Download it to open in the appropriate app."
          hideOpenButton
        />
      );
  }
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setFailed(false);

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load file");
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return (
      <p className="p-6 text-center text-sm text-gray-500">
        Couldn&apos;t load this file. Try downloading it instead.
      </p>
    );
  }

  if (content === null) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-gray-800 sm:p-6 sm:text-sm">
      {content}
    </pre>
  );
}

function OpenExternally({
  file,
  message,
  hideOpenButton = false,
}: {
  file: PreviewableFile;
  message: string;
  hideOpenButton?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-card">
        <FileIcon
          fileType={file.fileType}
          fileName={file.name}
          className="h-8 w-8"
        />
      </div>
      <p className="max-w-sm text-sm text-gray-600">{message}</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {!hideOpenButton && (
          <Button asChild>
            <a href={fileViewUrl(file.id)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open {file.name.split(".").pop()?.toUpperCase() || "file"}
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <a href={fileDownloadUrl(file.id)}>
            <Download className="h-4 w-4" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
}

/** Tracks whether the viewport is phone-sized (below Tailwind's `sm`). */
function useIsSmallScreen() {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsSmall(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isSmall;
}
