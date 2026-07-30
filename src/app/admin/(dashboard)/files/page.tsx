"use client";

import { useRef, useState } from "react";
import { FolderPlus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  FileBrowser,
  type BrowserFile,
  type BrowserFolder,
} from "@/components/files/FileBrowser";

type DeleteTarget = {
  type: "file" | "folder";
  id: string;
  name: string;
};

export default function AdminFilesPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editFolder, setEditFolder] = useState<BrowserFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => setReloadToken((token) => token + 1);

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
        await fetch("/api/files/upload", { method: "POST", body: formData });
      }
      refresh();
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
      refresh();
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
      refresh();
    } catch (error) {
      console.error("Error renaming folder:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const endpoint =
        deleteTarget.type === "file"
          ? `/api/files/${deleteTarget.id}`
          : `/api/folders/${deleteTarget.id}`;
      await fetch(endpoint, { method: "DELETE" });
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy sm:text-3xl">
            Files
          </h1>
          <p className="text-gray-500">
            Upload and organize the resources peer ministers see
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCreateFolderOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 sm:flex-none"
          >
            {isUploading ? (
              <>
                <Spinner size="sm" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
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

      <FileBrowser
        reloadToken={reloadToken}
        onNavigate={setCurrentFolderId}
        emptyTitle="This folder is empty"
        emptyHint="Upload files or create a folder to get started."
        folderActions={(folder: BrowserFolder) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditFolder(folder);
                setEditFolderName(folder.name);
              }}
              aria-label={`Rename ${folder.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:text-red-700"
              onClick={() =>
                setDeleteTarget({
                  type: "folder",
                  id: folder.id,
                  name: folder.name,
                })
              }
              aria-label={`Delete ${folder.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        fileActions={(file: BrowserFile) => (
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            onClick={() =>
              setDeleteTarget({ type: "file", id: file.id, name: file.name })
            }
            aria-label={`Delete ${file.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Create Folder */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              The folder will be created in the location you&apos;re currently
              viewing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Retreat Materials"
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

      {/* Rename Folder */}
      <Dialog open={!!editFolder} onOpenChange={() => setEditFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for this folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="editFolderName">Folder Name</Label>
            <Input
              id="editFolderName"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteTarget?.name}</span>?
              {deleteTarget?.type === "folder" && (
                <span className="mt-2 block text-red-600">
                  This will also delete every file and subfolder inside it.
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
    </div>
  );
}
