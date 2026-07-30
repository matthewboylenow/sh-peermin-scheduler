import {
  File as FileIconBase,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFileKind } from "@/lib/file-kinds";

interface FileIconProps {
  fileType: string;
  fileName?: string;
  className?: string;
}

/** Colour-coded icon so peer ministers can spot the file they want at a glance. */
export function FileIcon({ fileType, fileName = "", className }: FileIconProps) {
  const kind = getFileKind(fileType, fileName);
  const base = cn("h-5 w-5", className);

  switch (kind) {
    case "pdf":
      return <FileText className={cn(base, "text-rust")} />;
    case "image":
      return <FileImage className={cn(base, "text-info")} />;
    case "audio":
      return <FileAudio className={cn(base, "text-purple-500")} />;
    case "video":
      return <FileVideo className={cn(base, "text-red-500")} />;
    case "text":
      return <FileText className={cn(base, "text-gray-600")} />;
    case "office":
      return <FileSpreadsheet className={cn(base, "text-success")} />;
    default:
      return <FileIconBase className={cn(base, "text-gray-500")} />;
  }
}
