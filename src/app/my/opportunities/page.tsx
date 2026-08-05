"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarClock,
  Clock,
  ExternalLink,
  HandHeart,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { formatTimeRange, relativeEventDate } from "@/lib/datetime";
import { categoryLabel, categoryRank } from "@/lib/signup-categories";

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
  category: string;
  scheduleNote: string | null;
}

/**
 * Everything a peer minister can sign up for themselves.
 *
 * Two kinds sit here. Dated opportunities come from a scheduled event that
 * happens to have a sign-up link. Standing sign-ups have no single date at all
 * — a session series might span six evenings across two months — so we show
 * what it is and let the provider's page own the dates.
 */
export default function OpportunitiesPage() {
  const [dated, setDated] = useState<DatedOpportunity[]>([]);
  const [standing, setStanding] = useState<StandingSignup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/opportunities").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/signups").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([opportunities, signups]) => {
        if (cancelled) return;
        setDated(opportunities);
        setStanding(signups);
      })
      .catch((error) => console.error("Error loading sign-ups:", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Group the standing sign-ups so parish ministries sit apart from
  // peer ministry ones.
  const grouped = standing.reduce<Record<string, StandingSignup[]>>(
    (acc, signup) => {
      (acc[signup.category] ||= []).push(signup);
      return acc;
    },
    {}
  );
  const categories = Object.keys(grouped).sort(
    (a, b) => categoryRank(a) - categoryRank(b)
  );

  const isEmpty = dated.length === 0 && standing.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Sign-Ups</h1>
        <p className="text-gray-500">
          Claim a spot yourself — each link opens the sign-up page
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : isEmpty ? (
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
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                {categoryLabel(category)}
              </h2>
              <div className="space-y-3">
                {grouped[category].map((signup) => (
                  <Card key={signup.id}>
                    <CardContent className="p-4 sm:p-5">
                      <h3 className="font-semibold text-gray-900">
                        {signup.title}
                      </h3>

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
                        <a
                          href={signup.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open Sign-Up
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          {dated.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                Upcoming Dates
              </h2>
              <div className="space-y-3">
                {dated.map((opportunity) => (
                  <Card key={opportunity.id}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-gray-900">
                          {opportunity.title}
                        </h3>
                        <Badge className="flex-shrink-0 bg-rust text-white">
                          Sign-up
                        </Badge>
                      </div>

                      {opportunity.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {opportunity.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          {relativeEventDate(opportunity.eventDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 flex-shrink-0" />
                          {formatTimeRange(
                            opportunity.startTime,
                            opportunity.endTime
                          )}
                        </span>
                        {opportunity.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            {opportunity.location}
                          </span>
                        )}
                      </div>

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
