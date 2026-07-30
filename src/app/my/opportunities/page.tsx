"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
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

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  signupUrl: string;
  signupSource: string | null;
}

/**
 * Self-serve volunteer sign-ups. Unlike scheduled assignments, peer ministers
 * claim these themselves on the external sign-up page (usually SignUpGenius).
 */
export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/opportunities")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!cancelled) setOpportunities(data);
      })
      .catch((error) => console.error("Error loading opportunities:", error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">
          Volunteer Opportunities
        </h1>
        <p className="text-gray-500">
          Sign up for a spot directly with the organizer
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : opportunities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HandHeart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">No open opportunities right now</p>
            <p className="text-sm text-gray-400">
              New volunteer sign-ups will show up here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-gray-900">
                    {opportunity.title}
                  </h2>
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
      )}
    </div>
  );
}
