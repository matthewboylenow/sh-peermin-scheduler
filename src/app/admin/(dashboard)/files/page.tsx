"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Folder,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  File,
  Upload,
  FolderPlus,
  Trash2,
  ChevronRight,
  FolderOpen,
  MoreVertical,
  Pencil,
  Download,
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

export default function AdminFilesPage() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [editFolder, setEditFolder] = useState<FolderItem | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles(currentFolderId);
  }, [currentFolderId]);

  const fetchFiles = async (folderId: string | null) => {
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
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);
        if (currentFolderId) {
          formData.append("folderId", currentFolderId);
        }

        await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });
      }
      fetchFiles(currentFolderId);
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
        }),
      });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
      fetchFiles(currentFolderId);
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const handleRenameFolder = async () => {
    if (!editFolder || !editFolderName.trim()) return;

    try {
      await fetch(`/api/folders/${editFolder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFolderName }),
      });
      setEditFolder(null);
      setEditFolderName("");
      fetchFiles(currentFolderId);
    } catch (error) {
      console.error("Error renaming folder:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const endpoint = deleteTarget.type === 'file'
        ? `/api/files/${deleteTarget.id}`
        : `/api/folders/${deleteTarget.id}`;

      await fetch(endpoint, { method: "DELETE" });
      setDeleteTarget(null);
      fetchFiles(currentFolderId);
    } catch (error) {
      console.error("Error deleting:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Files</h1>
          <p className="text-gray-500">
            Manage ministry resources and documents
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name for the new folder
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="folderName">Folder Name</Label>
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="mt-2"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateFolderOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
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
          <CardDescription>
            {folders.length} folders, {files.length} files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {folders.length === 0 && files.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">This folder is empty</p>
              <p className="text-sm text-gray-400">
                Upload files or create a folder to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Folders */}
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
                >
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <div className="h-10 w-10 rounded-lg bg-navy/10 flex items-center justify-center">
                      <Folder className="h-5 w-5 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {folder.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(folder.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </button>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditFolder(folder);
                        setEditFolderName(folder.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Files */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
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
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={file.blobUrl} target="_blank" rel="noopener noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget({ type: 'file', id: file.id, name: file.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteTarget?.name}</span>?
              {deleteTarget?.type === 'folder' && (
                <span className="block mt-2 text-red-600">
                  This will also delete all files and subfolders inside it.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!editFolder} onOpenChange={() => setEditFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="editFolderName">Folder Name</Label>
            <Input
              id="editFolderName"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-2"
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFolder(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
