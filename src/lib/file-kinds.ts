/**
 * Classifies uploaded files so the UI knows whether it can render them inline
 * or should hand the user a download.
 */

export type FileKind =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "text"
  | "office"
  | "other";

const EXTENSION_KINDS: Record<string, FileKind> = {
  pdf: "pdf",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  heic: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
  mp3: "audio",
  m4a: "audio",
  wav: "audio",
  txt: "text",
  md: "text",
  csv: "text",
  doc: "office",
  docx: "office",
  xls: "office",
  xlsx: "office",
  ppt: "office",
  pptx: "office",
};

export function getFileKind(fileType: string, fileName = ""): FileKind {
  const mime = (fileType || "").toLowerCase();

  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";
  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.includes("powerpoint")
  ) {
    return "office";
  }

  // Browsers occasionally hand us an empty or generic MIME type on upload,
  // so fall back to the extension.
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_KINDS[extension] ?? "other";
}

/** Whether the browser can render this file without downloading it first. */
export function isViewableInBrowser(fileType: string, fileName = ""): boolean {
  const kind = getFileKind(fileType, fileName);
  return (
    kind === "pdf" ||
    kind === "image" ||
    kind === "video" ||
    kind === "audio" ||
    kind === "text"
  );
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Same-origin URL that streams the file for inline viewing. */
export function fileViewUrl(fileId: string): string {
  return `/api/files/${fileId}/content`;
}

/** Same-origin URL that forces a download with the original filename. */
export function fileDownloadUrl(fileId: string): string {
  return `/api/files/${fileId}/content?download=1`;
}

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  pdf: "PDF",
  image: "Image",
  video: "Video",
  audio: "Audio",
  text: "Document",
  office: "Document",
  other: "File",
};
