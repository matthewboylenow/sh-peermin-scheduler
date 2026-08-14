"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Link2, Plus, Trash2 } from "lucide-react";
import {
  SignUpGeniusImport,
  type ImportedOpportunity,
} from "@/components/events/SignUpGeniusImport";
import { formatTimeRange } from "@/lib/datetime";

interface SlotInput {
  name: string;
  capacity: number;
  notes: string;
}

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("mass");
  // Arriving from a day on the schedule prefills that day, so the date can't
  // be mistyped and a second event on an already-busy day starts correct.
  const [eventDate, setEventDate] = useState(() => {
    const fromUrl = searchParams.get("date");
    return fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? fromUrl : "";
  });
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [signupUrl, setSignupUrl] = useState("");
  const [signupSource, setSignupSource] = useState<"signupgenius" | "manual">(
    "manual"
  );
  const [recurrenceType, setRecurrenceType] = useState("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [slots, setSlots] = useState<SlotInput[]>([
    { name: "", capacity: 1, notes: "" },
  ]);

  /** Fill the form from a scraped SignUpGenius page, leaving blanks alone. */
  const applyImport = (result: ImportedOpportunity) => {
    if (result.title) setTitle(result.title);
    if (result.description) setDescription(result.description);
    if (result.eventDate) setEventDate(result.eventDate);
    if (result.startTime) setStartTime(result.startTime);
    if (result.endTime) setEndTime(result.endTime);
    if (result.location) setLocation(result.location);
    setSignupUrl(result.signupUrl);
    setSignupSource("signupgenius");
    setEventType("volunteer");
  };

  const addSlot = () => {
    setSlots([...slots, { name: "", capacity: 1, notes: "" }]);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof SlotInput, value: string | number) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const validSlots = slots.filter((slot) => slot.name.trim() !== "");

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          eventType,
          eventDate,
          startTime,
          endTime: endTime || undefined,
          location: location || undefined,
          signupUrl: signupUrl || undefined,
          signupSource: signupUrl ? signupSource : undefined,
          recurrenceType,
          recurrenceEndDate: recurrenceType !== "none" ? recurrenceEndDate : undefined,
          slots: validSlots.length > 0 ? validSlots : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create event");
      }

      const data = await response.json();
      router.push(`/admin/events/${data.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Link>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy">
          Create Event
        </h1>
        <p className="text-gray-500 mt-1">Add a new event to the schedule</p>
      </div>

      <SignUpGeniusImport onImported={applyImport} />

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
                    <SelectItem value="mass">Mass</SelectItem>
                    <SelectItem value="clow">CLOW</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="ministry">Ministry</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                  onChange={(e) => {
                    setSignupUrl(e.target.value);
                    setSignupSource(
                      e.target.value.includes("signupgenius.com")
                        ? "signupgenius"
                        : "manual"
                    );
                  }}
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

        {/* Recurrence */}
        <Card>
          <CardHeader>
            <CardTitle>Recurrence</CardTitle>
            <CardDescription>
              Create multiple instances of this event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="recurrenceType">Repeat</Label>
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrenceType !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="recurrenceEndDate">Repeat Until *</Label>
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    min={eventDate}
                    required={recurrenceType !== "none"}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slots */}
        <Card>
          <CardHeader>
            <CardTitle>Slots</CardTitle>
            <CardDescription>
              Define the roles needed for this event (e.g., Greeter, Usher)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Role Name</Label>
                    <Input
                      value={slot.name}
                      onChange={(e) => updateSlot(index, "name", e.target.value)}
                      placeholder="e.g., Greeter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={slot.capacity}
                      onChange={(e) =>
                        updateSlot(index, "capacity", parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={slot.notes}
                      onChange={(e) => updateSlot(index, "notes", e.target.value)}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                {slots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-7 text-gray-400 hover:text-error"
                    onClick={() => removeSlot(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addSlot}>
              <Plus className="mr-2 h-4 w-4" />
              Add Slot
            </Button>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              "Create Event"
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

// useSearchParams needs a Suspense boundary to keep this route prerenderable.
export default function NewEventPage() {
  return (
    <Suspense fallback={null}>
      <NewEventForm />
    </Suspense>
  );
}
