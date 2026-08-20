"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Link2 } from "lucide-react";
import { formatTimeRange } from "@/lib/datetime";
import { EVENT_TYPES } from "@/lib/event-types";

interface Event {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  signupUrl: string | null;
  recurrenceType: string;
  parentEventId: string | null;
  childEvents?: { id: string }[];
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasChildEvents, setHasChildEvents] = useState(false);
  const [updateFutureInstances, setUpdateFutureInstances] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("mass");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [signupUrl, setSignupUrl] = useState("");

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data: Event = await response.json();
        setTitle(data.title);
        setDescription(data.description || "");
        setEventType(data.eventType);
        setEventDate(data.eventDate);
        setStartTime(data.startTime);
        setEndTime(data.endTime || "");
        setLocation(data.location || "");
        setSignupUrl(data.signupUrl || "");
        setHasChildEvents(
          data.recurrenceType !== "none" &&
            !!data.childEvents &&
            data.childEvents.length > 0
        );
      } else if (response.status === 404) {
        router.push("/admin/events");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      setError("Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          eventType,
          eventDate,
          startTime,
          endTime: endTime || null,
          location: location || null,
          signupUrl: signupUrl || "",
          signupSource: signupUrl.includes("signupgenius.com")
            ? "signupgenius"
            : "manual",
          updateFutureInstances,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update event");
      }

      router.push(`/admin/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Event
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
          Edit Event
        </h1>
        <p className="text-gray-500 mt-1">Update event details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>Basic information about the event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sunday Mass"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                className="flex min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:border-navy"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Church, Parish Hall"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signupUrl">Volunteer Sign-Up Link</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="signupUrl"
                  type="url"
                  inputMode="url"
                  value={signupUrl}
                  onChange={(e) => setSignupUrl(e.target.value)}
                  placeholder="https://www.signupgenius.com/go/..."
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-gray-500">
                Optional. When set, this event appears under Volunteer
                Opportunities so peer ministers can sign up themselves.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle>Date & Time</CardTitle>
            <CardDescription>When does this event take place?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {startTime && (
              <p className="text-sm text-gray-500">
                Peer ministers will see{" "}
                <span className="font-medium text-gray-700">
                  {formatTimeRange(startTime, endTime)} ET
                </span>
                .
              </p>
            )}
          </CardContent>
        </Card>

        {/* Update Future Instances */}
        {hasChildEvents && (
          <Card>
            <CardHeader>
              <CardTitle>Recurring Event</CardTitle>
              <CardDescription>
                This event has recurring instances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateFutureInstances}
                  onChange={(e) => setUpdateFutureInstances(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy"
                />
                <span className="text-sm text-gray-700">
                  Apply changes to all future instances of this event
                </span>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
