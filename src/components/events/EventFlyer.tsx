"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { AlertTriangle, ImageUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { FileIcon } from "@/components/files/FileIcon";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import {
  fileDownloadUrl,
  fileViewUrl,
  formatFileSize,
  getFileKind,
} from "@/lib/file-kinds";
import { ACCEPT_ATTRIBUTE, validateUpload } from "@/lib/upload-limits";

export interface FlyerFile {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
}

interface EventFlyerProps {
  eventId: string;
  flyer: FlyerFile | null;
  onChange: () => void;
}

/**
 * Flyer attached to an event.
 *
 * Uploads go the same route as every other file — straight to Blob storage,
 * then registered — so this inherits the type and size limits, the
 * authenticated proxy and the in-app viewer instead of growing a second
 * upload path. Only the link from the event is new.
 */
export function EventFlyer({ eventId, flyer, onChange }: EventFlyerProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const check = validateUpload(file.name, file.type, file.size);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setError("");
    setIsBusy(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/files/upload",
      });

      const registered = await fetch("/api/files/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          blobUrl: blob.url,
          fileType: file.type || blob.contentType,
          fileSize: file.size,
          folderId: null,
        }),
      });
      if (!registered.ok) {
        const data = await registered.json().catch(() => ({}));
        throw new Error(data.error || "Could not save the flyer");
      }
      const saved = await registered.json();

      const linked = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flyerFileId: saved.id }),
      });
      if (!linked.ok) throw new Error("Could not attach the flyer");

      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsBusy(false);
    }
  };

  /** Unlinks the flyer. The file itself stays in Files. */
  const removeFlyer = async () => {
    setIsBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flyerFileId: null }),
      });
      if (!response.ok) throw new Error("Could not remove the flyer");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setIsBusy(false);
    }
  };

  const isImage = flyer
    ? getFileKind(flyer.fileType, flyer.name) === "image"
    : false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageUp className="h-5 w-5" />
          Flyer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {flyer ? (
          <>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="block w-full overflow-hidden rounded-lg border border-gray-200 text-left transition-colors hover:border-navy/40"
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileViewUrl(flyer.id)}
                  alt={flyer.name}
                  className="max-h-72 w-full bg-gray-50 object-contain"
                />
              ) : null}
              <div className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <FileIcon fileType={flyer.fileType} fileName={flyer.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {flyer.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(flyer.fileSize)} · tap to view
                  </p>
                </div>
              </div>
            </button>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
              >
                Replace
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={fileDownloadUrl(flyer.id)}>Download</a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFlyer}
                disabled={isBusy}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Add a flyer and peer ministers will see it on this event.
            </p>
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
            >
              {isBusy ? (
                <>
                  <Spinner size="sm" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImageUp className="h-4 w-4" />
                  Upload Flyer
                </>
              )}
            </Button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={handleFile}
        />
      </CardContent>

      <FilePreviewDialog
        file={isPreviewOpen && flyer ? flyer : null}
        onClose={() => setIsPreviewOpen(false)}
      />
    </Card>
  );
}
