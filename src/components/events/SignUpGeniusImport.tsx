"use client";

import { useState } from "react";
import { AlertTriangle, ClipboardPaste, Link2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export interface ImportedOpportunity {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  signupUrl: string;
  source: "ai" | "heuristic";
  warnings: string[];
  needsPastedDetails?: boolean;
}

/**
 * Paste a SignUpGenius link and we read the page for you, filling in the date,
 * time, and description so the admin only has to check the details.
 */
export function SignUpGeniusImport({
  onImported,
}: {
  onImported: (result: ImportedOpportunity) => void;
}) {
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [didImport, setDidImport] = useState(false);
  const [needsPaste, setNeedsPaste] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const runImport = async (text?: string) => {
    if (!url.trim()) return;

    setError("");
    setWarnings([]);
    setDidImport(false);
    setIsImporting(true);

    try {
      const response = await fetch("/api/events/import-signupgenius", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), pastedText: text }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Couldn't read that sign-up page");
      }

      onImported(data as ImportedOpportunity);

      if (data.needsPastedDetails) {
        // The page builds itself in the browser, so the link alone gave us
        // only the title. Ask for the text rather than guessing.
        setNeedsPaste(true);
        setWarnings([]);
      } else {
        setNeedsPaste(false);
        setWarnings(data.warnings ?? []);
        setDidImport(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => runImport();

  return (
    <Card className="border-rust/30 bg-rust/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-rust" />
          Import from SignUpGenius
        </CardTitle>
        <CardDescription>
          Paste a SignUpGenius link and we&apos;ll read the page and fill in the
          details below. Review them before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="signupGeniusUrl">SignUpGenius URL</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="signupGeniusUrl"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.signupgenius.com/go/..."
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleImport();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="accent"
              onClick={handleImport}
              disabled={isImporting || !url.trim()}
            >
              {isImporting ? (
                <>
                  <Spinner size="sm" />
                  Reading...
                </>
              ) : (
                "Fetch Details"
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
          >
            {error}
          </div>
        )}

        {needsPaste && (
          <div className="space-y-3 rounded-lg border border-navy/20 bg-white p-4">
            <div className="flex items-start gap-2">
              <ClipboardPaste className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy" />
              <div className="space-y-1 text-sm text-gray-700">
                <p className="font-medium text-navy">
                  One more step for this sign-up
                </p>
                <p>
                  SignUpGenius builds its pages in your browser, so the link on
                  its own doesn&apos;t include the date or time. Open the
                  sign-up, select the whole page (
                  <kbd className="rounded bg-gray-100 px-1">Ctrl</kbd>/
                  <kbd className="rounded bg-gray-100 px-1">⌘</kbd> +{" "}
                  <kbd className="rounded bg-gray-100 px-1">A</kbd>, then{" "}
                  <kbd className="rounded bg-gray-100 px-1">C</kbd>), and paste
                  it below.
                </p>
              </div>
            </div>

            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={5}
              placeholder="Paste the sign-up page here…"
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:border-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            />

            <Button
              type="button"
              onClick={() => runImport(pastedText)}
              disabled={isImporting || pastedText.trim().length < 20}
              className="w-full sm:w-auto"
            >
              {isImporting ? (
                <>
                  <Spinner size="sm" />
                  Reading...
                </>
              ) : (
                "Read Pasted Details"
              )}
            </Button>
          </div>
        )}

        {didImport && warnings.length === 0 && (
          <p className="text-sm text-success">
            Details imported — please double-check them below.
          </p>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-gray-700">
            <p className="flex items-center gap-2 font-medium text-warning">
              <AlertTriangle className="h-4 w-4" />
              Check these before saving
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
