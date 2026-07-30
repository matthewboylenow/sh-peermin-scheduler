/**
 * What may be uploaded, and how big it can be.
 *
 * This is the single source of truth for both sides of the upload: the browser
 * checks it before starting (so nobody waits on a 40 MB upload that was never
 * going to be accepted) and the server checks it again when issuing the upload
 * token. Add a new file type here and both ends pick it up.
 */

const MB = 1024 * 1024;

export interface UploadType {
  /** MIME types a browser might report for this extension. */
  mime: string[];
  maxBytes: number;
  label: string;
}

export const UPLOAD_TYPES: Record<string, UploadType> = {
  pdf: {
    mime: ["application/pdf"],
    maxBytes: 50 * MB,
    label: "PDF",
  },
  docx: {
    mime: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    maxBytes: 25 * MB,
    label: "Word document",
  },
  pptx: {
    mime: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    maxBytes: 50 * MB,
    label: "PowerPoint",
  },
  jpg: { mime: ["image/jpeg"], maxBytes: 15 * MB, label: "JPEG image" },
  jpeg: { mime: ["image/jpeg"], maxBytes: 15 * MB, label: "JPEG image" },
  png: { mime: ["image/png"], maxBytes: 15 * MB, label: "PNG image" },
};

/** Largest cap across all types — the ceiling we hand Vercel Blob. */
export const MAX_UPLOAD_BYTES = Math.max(
  ...Object.values(UPLOAD_TYPES).map((type) => type.maxBytes)
);

/** Every MIME type we accept, for the Blob token's allowlist. */
export const ALLOWED_CONTENT_TYPES = [
  ...new Set(Object.values(UPLOAD_TYPES).flatMap((type) => type.mime)),
];

/** For the file picker's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = [
  ...Object.keys(UPLOAD_TYPES).map((extension) => `.${extension}`),
  ...ALLOWED_CONTENT_TYPES,
].join(",");

/** Human-readable summary for help text, e.g. "PDF, Word document, …". */
export const ALLOWED_TYPES_SUMMARY = [
  ...new Set(Object.values(UPLOAD_TYPES).map((type) => type.label)),
].join(", ");

export function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

/**
 * Look up the rules for a filename. Extension is the key rather than the
 * browser-reported MIME type, which is empty or wrong often enough that it
 * can't be the gate.
 */
export function getUploadType(fileName: string): UploadType | null {
  return UPLOAD_TYPES[getExtension(fileName)] ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
}

export type UploadCheck = { ok: true } | { ok: false; error: string };

/**
 * Validate a file before (and again after) it reaches Blob storage.
 * `mimeType` is advisory — an empty or unexpected value is tolerated as long
 * as the extension is one we allow.
 */
export function validateUpload(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): UploadCheck {
  const type = getUploadType(fileName);

  if (!type) {
    const extension = getExtension(fileName);
    return {
      ok: false,
      error: extension
        ? `.${extension} files aren't supported. Allowed: ${ALLOWED_TYPES_SUMMARY}.`
        : `"${fileName}" has no file extension. Allowed: ${ALLOWED_TYPES_SUMMARY}.`,
    };
  }

  if (sizeBytes <= 0) {
    return { ok: false, error: `"${fileName}" is empty.` };
  }

  if (sizeBytes > type.maxBytes) {
    return {
      ok: false,
      error: `"${fileName}" is ${formatBytes(sizeBytes)}. The limit for a ${type.label} is ${formatBytes(type.maxBytes)}.`,
    };
  }

  // `mimeType` is deliberately not enforced here: browsers report nothing at
  // all for .docx/.pptx often enough that rejecting on it would block valid
  // files. Blob enforces the content-type allowlist on its side.
  return { ok: true };
}
