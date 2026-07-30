"use client";

import { useState } from "react";
import { AlertTriangle, Link2, Sparkles } from "lucide-react";
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

  const handleImport = async () => {
    if (!url.trim()) return;

    setError("");
    setWarnings([]);
    setDidImport(false);
    setIsImporting(true);

    try {
      const response = await fetch("/api/events/import-signupgenius", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Couldn't read that sign-up page");
      }

      onImported(data as ImportedOpportunity);
      setWarnings(data.warnings ?? []);
      setDidImport(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsImporting(false);
    }
  };

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
