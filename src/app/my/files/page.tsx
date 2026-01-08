"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Folder,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  File,
  Download,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface FileItem {
  id: string;
  name: string;
  blobUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  createdAt: string;
}

interface Breadcrumb {
  id: string | null;
  name: string;
}

export default function MyFilesPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId]);

  const fetchFiles = async (folderId: string | null) => {
    try {
      setIsLoading(true);
      const url = folderId
        ? `/api/files?folderId=${folderId}`
        : "/api/files";
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
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    if (fileType.startsWith("audio/")) {
      return <FileAudio className="h-5 w-5 text-purple-500" />;
    }
    if (fileType.startsWith("video/")) {
      return <FileVideo className="h-5 w-5 text-red-500" />;
    }
    if (
      fileType.includes("pdf") ||
      fileType.includes("document") ||
      fileType.includes("text")
    ) {
      return <FileText className="h-5 w-5 text-orange-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Files</h1>
        <p className="text-gray-500">Ministry resources and documents</p>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-1 text-sm text-gray-500">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id ?? "root"} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
            <button
              onClick={() => navigateToFolder(crumb.id)}
              className={`hover:text-navy transition-colors ${
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

      {/* Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5" />
            {breadcrumbs[breadcrumbs.length - 1]?.name || "Files"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {folders.length === 0 && files.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No files or folders here</p>
              <p className="text-sm text-gray-400">
                Check back later for ministry resources
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Folders */}
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.id)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center">
                    <Folder className="h-5 w-5 text-navy" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {folder.name}
                    </p>
                    <p className="text-sm text-gray-500">Folder</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.fileSize)} •{" "}
                      {format(parseISO(file.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={file.blobUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
