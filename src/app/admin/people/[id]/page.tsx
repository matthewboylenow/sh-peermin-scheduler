"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Save,
  UserX,
  UserCheck,
  History,
} from "lucide-react";

interface Assignment {
  id: string;
  slot: {
    id: string;
    name: string;
    event: {
      id: string;
      title: string;
      eventType: string;
      eventDate: string;
      startTime: string;
      location: string | null;
    };
  };
}

interface PeerMinister {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  assignments: Assignment[];
}

const eventTypeColors: Record<string, string> = {
  mass: "bg-navy",
  clow: "bg-rust",
  volunteer: "bg-success",
  ministry: "bg-info",
  other: "bg-gray-500",
};

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [person, setPerson] = useState<PeerMinister | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    fetchPerson();
  }, [id]);

  const fetchPerson = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPerson(data);
        setName(data.name);
        setPhone(formatPhoneDisplay(data.phone));
      } else if (response.status === 404) {
        router.push("/admin/people");
      }
    } catch (error) {
      console.error("Error fetching person:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneInput(e.target.value));
  };

  const handleSave = async () => {
    setError("");
    setSuccessMessage("");

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phoneDigits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update");
      }

      setPerson((prev) => (prev ? { ...prev, name, phone: data.phone } : null));
      setSuccessMessage("Changes saved successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!person) return;

    const action = person.isActive ? "deactivate" : "reactivate";
    if (
      !confirm(
        `Are you sure you want to ${action} ${person.name}? ${
          person.isActive
            ? "They will no longer be able to log in or be assigned to events."
            : "They will be able to log in and be assigned to events again."
        }`
      )
    ) {
      return;
    }

    setIsToggling(true);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !person.isActive,
        }),
      });

      if (response.ok) {
        setPerson((prev) =>
          prev ? { ...prev, isActive: !prev.isActive } : null
        );
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    } finally {
      setIsToggling(false);
    }
  };

  // Split assignments into upcoming and past
  const today = new Date().toISOString().split("T")[0];
  const upcomingAssignments =
    person?.assignments.filter((a) => a.slot.event.eventDate >= today) || [];
  const pastAssignments =
    person?.assignments.filter((a) => a.slot.event.eventDate < today) || [];

  // Sort by date
  upcomingAssignments.sort((a, b) =>
    a.slot.event.eventDate.localeCompare(b.slot.event.eventDate)
  );
  pastAssignments.sort((a, b) =>
    b.slot.event.eventDate.localeCompare(a.slot.event.eventDate)
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Person not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/people"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Peer Ministers
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-navy flex items-center justify-center">
              <span className="text-2xl font-medium text-white">
                {person.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-3xl font-bold text-navy">
                  {person.name}
                </h1>
                <Badge variant={person.isActive ? "default" : "secondary"}>
                  {person.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-gray-500">
                Member since {format(parseISO(person.createdAt), "MMMM yyyy")}
              </p>
            </div>
          </div>

          <Button
            variant={person.isActive ? "outline" : "default"}
            onClick={handleToggleActive}
            disabled={isToggling}
          >
            {isToggling ? (
              <Spinner size="sm" />
            ) : person.isActive ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Reactivate
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Update personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
                  {successMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Upcoming Assignments</span>
                <span className="font-semibold text-navy">
                  {upcomingAssignments.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Past Assignments</span>
                <span className="font-semibold text-gray-600">
                  {pastAssignments.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold">
                  {person.assignments.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignment History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Assignments
              </CardTitle>
              <CardDescription>
                {upcomingAssignments.length} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAssignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No upcoming assignments
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingAssignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/admin/events/${assignment.slot.event.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:border-navy/30 hover:shadow-sm transition-all"
                    >
                      <div
                        className={`w-1 h-12 rounded-full ${eventTypeColors[assignment.slot.event.eventType]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {assignment.slot.event.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {assignment.slot.name}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium text-navy">
                          {format(
                            parseISO(assignment.slot.event.eventDate),
                            "MMM d"
                          )}
                        </p>
                        <p className="text-gray-500">
                          {assignment.slot.event.startTime}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Past Assignments
              </CardTitle>
              <CardDescription>
                {pastAssignments.length} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastAssignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No past assignments
                </p>
              ) : (
                <div className="space-y-3">
                  {pastAssignments.slice(0, 10).map((assignment) => (
                    <Link
                      key={assignment.id}
                      href={`/admin/events/${assignment.slot.event.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-all opacity-75"
                    >
                      <div
                        className={`w-1 h-12 rounded-full ${eventTypeColors[assignment.slot.event.eventType]} opacity-50`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 truncate">
                          {assignment.slot.event.title}
                        </p>
                        <p className="text-sm text-gray-400">
                          {assignment.slot.name}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-500">
                          {format(
                            parseISO(assignment.slot.event.eventDate),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {pastAssignments.length > 10 && (
                    <p className="text-sm text-gray-400 text-center pt-2">
                      +{pastAssignments.length - 10} more past assignments
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
