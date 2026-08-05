"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  EyeOff,
  Link2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  SIGNUP_CATEGORIES,
  categoryLabel,
  categoryRank,
} from "@/lib/signup-categories";

interface Signup {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  scheduleNote: string | null;
  sortOrder: number;
  isActive: boolean;
}

const BLANK = {
  title: "",
  description: "",
  url: "",
  category: "peer_ministry",
  scheduleNote: "",
  isActive: true,
};

export default function AdminSignupsPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Signup | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Signup | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/signups?includeInactive=1");
      if (response.ok) setSignups(await response.json());
    } catch (err) {
      console.error("Error loading sign-ups:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...BLANK });
    setError("");
    setIsFormOpen(true);
  };

  const openEdit = (signup: Signup) => {
    setEditing(signup);
    setForm({
      title: signup.title,
      description: signup.description ?? "",
      url: signup.url,
      category: signup.category,
      scheduleNote: signup.scheduleNote ?? "",
      isActive: signup.isActive,
    });
    setError("");
    setIsFormOpen(true);
  };

  /**
   * Read the sign-up page to fill in title and description. Deliberately does
   * not touch dates — these sign-ups often span many, and the provider's page
   * is the source of truth for them.
   */
  const fetchDetails = async () => {
    if (!form.url.trim()) return;
    setIsFetchingDetails(true);
    setError("");
    try {
      const response = await fetch("/api/events/import-signupgenius", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't read that page");

      setForm((current) => ({
        ...current,
        title: data.title || current.title,
        description: data.description || current.description,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError("A title and a link are both required.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(
        editing ? `/api/signups/${editing.id}` : "/api/signups",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim() || null,
            url: form.url.trim(),
            category: form.category,
            scheduleNote: form.scheduleNote.trim() || null,
            isActive: form.isActive,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save");

      setIsFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/signups/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    load();
  };

  const grouped = signups.reduce<Record<string, Signup[]>>((acc, signup) => {
    (acc[signup.category] ||= []).push(signup);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort(
    (a, b) => categoryRank(a) - categoryRank(b)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
            Sign-Ups
          </h1>
          <p className="text-gray-500">
            Standing links peer ministers can claim a spot on themselves
          </p>
        </div>
        <Button onClick={openNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Sign-Up
        </Button>
      </div>

      <p className="text-sm text-gray-500">
        Use these for sign-ups that cover several dates — a session series, the
        hospitality rota, parish ministries. The dates live on the sign-up page
        itself, so nothing here needs updating when they change. For a single
        dated event with slots you assign, create an Event instead.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : signups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No sign-ups yet</p>
            <p className="mb-4 text-sm text-gray-400">
              Paste a SignUpGenius link and we&apos;ll fill in the details.
            </p>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              Add Sign-Up
            </Button>
          </CardContent>
        </Card>
      ) : (
        categories.map((category) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              {categoryLabel(category)}
            </h2>
            <div className="space-y-3">
              {grouped[category].map((signup) => (
                <Card key={signup.id} className={signup.isActive ? "" : "opacity-60"}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {signup.title}
                        </h3>
                        {!signup.isActive && (
                          <Badge variant="secondary" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {signup.scheduleNote && (
                        <p className="mt-0.5 text-sm font-medium text-navy">
                          {signup.scheduleNote}
                        </p>
                      )}
                      <a
                        href={signup.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 break-all text-sm text-gray-500 hover:text-navy"
                      >
                        {signup.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex flex-shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(signup)}
                        aria-label={`Edit ${signup.title}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(signup)}
                        aria-label={`Delete ${signup.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Add / edit */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sign-Up" : "Add Sign-Up"}</DialogTitle>
            <DialogDescription>
              Paste the link first and we&apos;ll try to fill in the rest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="signupUrlField">Sign-Up Link *</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="signupUrlField"
                    type="url"
                    inputMode="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://www.signupgenius.com/go/..."
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  variant="accent"
                  onClick={fetchDetails}
                  disabled={isFetchingDetails || !form.url.trim()}
                >
                  {isFetchingDetails ? (
                    <>
                      <Spinner size="sm" />
                      Reading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupTitle">Title *</Label>
              <Input
                id="signupTitle"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. MS Small/Large Group Session"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupCategory">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger id="signupCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNUP_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupNote">When (optional)</Label>
              <Input
                id="signupNote"
                value={form.scheduleNote}
                onChange={(e) =>
                  setForm({ ...form, scheduleNote: e.target.value })
                }
                placeholder="e.g. Sept 9, 16, 23 and Nov 4, 11, 18"
              />
              <p className="text-xs text-gray-500">
                Free text shown above the description. Leave blank if the dates
                are best left to the sign-up page.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupDescription">Description</Label>
              <textarea
                id="signupDescription"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={5}
                placeholder="What is this sign-up for?"
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:border-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
              />
              <span className="text-sm text-gray-700">
                Show to peer ministers
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Spinner size="sm" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Sign-Up</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-medium">{deleteTarget?.title}</span> from
              the sign-ups page? The sign-up itself is not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
