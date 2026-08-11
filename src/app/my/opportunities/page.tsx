"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Folder,
  HandHeart,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatEventDate, formatTimeRange } from "@/lib/datetime";
import type { SignupsLayout } from "@/lib/app-settings";

interface DatedOpportunity {
  id: string;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  signupUrl: string;
}

interface StandingSignup {
  id: string;
  title: string;
  description: string | null;
  url: string;
  folderId: string | null;
  scheduleNote: string | null;
}

interface SignupFolder {
  id: string;
  name: string;
  description: string | null;
}

/**
 * Everything a peer minister can sign up for themselves.
 *
 * Two kinds sit here. Dated opportunities come from a scheduled event that
 * happens to have a sign-up link. Standing sign-ups have no single date at all
 * — a session series might span six evenings across two months — so we show
 * what it is and let the provider's page own the dates.
 *
 * Standing sign-ups can be grouped into folders. Whether those folders are
 * something you tap into or just headings on one long page is a super admin
 * setting, because which one the teens actually find faster is a guess until
 * they have used it.
 */
export default function OpportunitiesPage() {
  const [dated, setDated] = useState<DatedOpportunity[]>([]);
  const [standing, setStanding] = useState<StandingSignup[]>([]);
  const [folders, setFolders] = useState<SignupFolder[]>([]);
  const [layout, setLayout] = useState<SignupsLayout>("folders");
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/opportunities").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/signups").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/signup-folders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/app-settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([opportunities, signups, signupFolders, settings]) => {
        if (cancelled) return;
        setDated(opportunities);
        setStanding(signups);
        setFolders(signupFolders);
        if (settings?.signupsLayout) setLayout(settings.signupsLayout);
      })
      .catch((error) => console.error("Error loading sign-ups:", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const byFolder = useMemo(() => {
    const known = new Set(folders.map((folder) => folder.id));
    const map = new Map<string, StandingSignup[]>();
    for (const signup of standing) {
      // A sign-up pointing at a folder we don't have falls back to the top
      // level. Better a teen sees it out of place than not at all.
      const key =
        signup.folderId && known.has(signup.folderId) ? signup.folderId : "";
      const list = map.get(key);
      if (list) list.push(signup);
      else map.set(key, [signup]);
    }
    return map;
  }, [standing, folders]);

  // Empty folders would be a dead end for a teen, so only show the ones that
  // actually have something in them.
  const visibleFolders = folders.filter(
    (folder) => (byFolder.get(folder.id)?.length ?? 0) > 0
  );
  const loose = byFolder.get("") ?? [];
  const openFolder = visibleFolders.find((f) => f.id === openFolderId) ?? null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Inside a folder: one back link and the sign-ups, nothing else competing.
  if (openFolder) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setOpenFolderId(null)}
          className="-ml-1 flex min-h-[44px] items-center gap-1 text-sm font-medium text-navy"
        >
          <ChevronLeft className="h-4 w-4" />
          All sign-ups
        </button>

        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            {openFolder.name}
          </h1>
          {openFolder.description && (
            <p className="text-gray-500">{openFolder.description}</p>
          )}
        </div>

        <div className="space-y-3">
          {(byFolder.get(openFolder.id) ?? []).map((signup) => (
            <SignupCard key={signup.id} signup={signup} />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty =
    dated.length === 0 && standing.length === 0 && visibleFolders.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Sign-Ups</h1>
        <p className="text-gray-500">
          Claim a spot yourself — each link opens the sign-up page
        </p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HandHeart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">Nothing open right now</p>
            <p className="text-sm text-gray-400">
              New sign-ups will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {layout === "folders" ? (
            <>
              {visibleFolders.length > 0 && (
                <div className="space-y-3">
                  {visibleFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setOpenFolderId(folder.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                    >
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-navy/10">
                        <Folder className="h-5 w-5 text-navy" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900">
                          {folder.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {byFolder.get(folder.id)?.length}{" "}
                          {byFolder.get(folder.id)?.length === 1
                            ? "sign-up"
                            : "sign-ups"}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}

              {loose.length > 0 && (
                <section>
                  {visibleFolders.length > 0 && (
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Everything Else
                    </h2>
                  )}
                  <div className="space-y-3">
                    {loose.map((signup) => (
                      <SignupCard key={signup.id} signup={signup} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              {visibleFolders.map((folder) => (
                <section key={folder.id}>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    {folder.name}
                  </h2>
                  <div className="space-y-3">
                    {(byFolder.get(folder.id) ?? []).map((signup) => (
                      <SignupCard key={signup.id} signup={signup} />
                    ))}
                  </div>
                </section>
              ))}

              {loose.length > 0 && (
                <section>
                  {visibleFolders.length > 0 && (
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Everything Else
                    </h2>
                  )}
                  <div className="space-y-3">
                    {loose.map((signup) => (
                      <SignupCard key={signup.id} signup={signup} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {dated.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Upcoming Dates
              </h2>
              {/* Already sorted oldest-first by the API. */}
              <div className="space-y-3">
                {dated.map((opportunity) => (
                  <Card key={opportunity.id}>
                    <CardContent className="p-4 sm:p-5">
                      <h3 className="font-semibold text-gray-900">
                        {opportunity.title}
                      </h3>

                      <p className="mt-1 flex items-start gap-1.5 text-sm font-medium text-navy">
                        <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                          {formatEventDate(opportunity.eventDate, "full")} ·{" "}
                          {formatTimeRange(
                            opportunity.startTime,
                            opportunity.endTime
                          )}
                        </span>
                      </p>

                      {opportunity.location && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          {opportunity.location}
                        </p>
                      )}

                      {opportunity.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {opportunity.description}
                        </p>
                      )}

                      <Button asChild className="mt-4 w-full sm:w-auto">
                        <a
                          href={opportunity.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Sign Up
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function SignupCard({ signup }: { signup: StandingSignup }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <h3 className="font-semibold text-gray-900">{signup.title}</h3>

        {signup.scheduleNote && (
          <p className="mt-1 flex items-start gap-1.5 text-sm font-medium text-navy">
            <CalendarClock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {signup.scheduleNote}
          </p>
        )}

        {signup.description && (
          <p className="mt-2 whitespace-pre-line text-sm text-gray-600">
            {signup.description}
          </p>
        )}

        <Button asChild className="mt-4 w-full sm:w-auto">
          <a href={signup.url} target="_blank" rel="noopener noreferrer">
            Open Sign-Up
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
