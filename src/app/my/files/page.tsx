import type { Metadata } from "next";
import { FileBrowser } from "@/components/files/FileBrowser";

export const metadata: Metadata = {
  title: "Files",
};

export default async function MyFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Files</h1>
        <p className="text-gray-500">Ministry resources and documents</p>
      </div>

      <FileBrowser
        initialFolderId={folder ?? null}
        emptyTitle="No files or folders here"
        emptyHint="Check back later for ministry resources."
      />
    </div>
  );
}
