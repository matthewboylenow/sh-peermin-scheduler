"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle } from "lucide-react";

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
      endTime: string | null;
      location: string | null;
    };
  };
}

const eventTypeLabels: Record<string, string> = {
  mass: "Mass",
  clow: "CLOW",
  volunteer: "Volunteer",
  ministry: "Ministry",
  other: "Other",
};

const eventTypeColors: Record<string, string> = {
  mass: "bg-navy",
  clow: "bg-rust",
  volunteer: "bg-success",
  ministry: "bg-info",
  other: "bg-gray-500",
};

export default function MySchedulePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/assignments");
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort assignments
  const today = new Date().toISOString().split("T")[0];
  const upcomingAssignments = assignments
    .filter((a) => a.slot.event.eventDate >= today)
    .sort((a, b) =>
      a.slot.event.eventDate.localeCompare(b.slot.event.eventDate)
    );

  const pastAssignments = assignments
    .filter((a) => a.slot.event.eventDate < today)
    .sort((a, b) =>
      b.slot.event.eventDate.localeCompare(a.slot.event.eventDate)
    );

  // Get next assignment
  const nextAssignment = upcomingAssignments[0];

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">My Schedule</h1>
        <p className="text-gray-500">Your upcoming assignments</p>
      </div>

      {/* Next Assignment Highlight */}
      {nextAssignment && (
        <Card className="border-2 border-navy bg-navy/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-navy" />
              <CardTitle className="text-lg text-navy">
                {isToday(parseISO(nextAssignment.slot.event.eventDate))
                  ? "Coming Up Today"
                  : isTomorrow(parseISO(nextAssignment.slot.event.eventDate))
                    ? "Tomorrow"
                    : "Next Assignment"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div
                className={`w-1.5 h-full min-h-16 rounded-full ${eventTypeColors[nextAssignment.slot.event.eventType]}`}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900">
                  {nextAssignment.slot.event.title}
                </h3>
                <p className="text-navy font-medium">
                  {nextAssignment.slot.name}
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {getDateLabel(nextAssignment.slot.event.eventDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {nextAssignment.slot.event.startTime}
                    {nextAssignment.slot.event.endTime &&
                      ` - ${nextAssignment.slot.event.endTime}`}
                  </span>
                  {nextAssignment.slot.event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {nextAssignment.slot.event.location}
                    </span>
                  )}
                </div>
              </div>
              <Badge className={eventTypeColors[nextAssignment.slot.event.eventType]}>
                {eventTypeLabels[nextAssignment.slot.event.eventType]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming ({upcomingAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAssignments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No upcoming assignments</p>
              <p className="text-sm text-gray-400">
                Check back later or contact an administrator
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map((assignment, index) => (
                <div
                  key={assignment.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border border-gray-200 ${
                    index === 0 ? "bg-gray-50" : ""
                  }`}
                >
                  <div
                    className={`w-1 h-14 rounded-full ${eventTypeColors[assignment.slot.event.eventType]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">
                        {assignment.slot.event.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {assignment.slot.name}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      <span>{getDateLabel(assignment.slot.event.eventDate)}</span>
                      <span>{assignment.slot.event.startTime}</span>
                      {assignment.slot.event.location && (
                        <span>{assignment.slot.event.location}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Assignments */}
      {pastAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-500">
              <CheckCircle className="h-5 w-5" />
              Past ({pastAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastAssignments.slice(0, 5).map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 opacity-75"
                >
                  <div
                    className={`w-1 h-10 rounded-full ${eventTypeColors[assignment.slot.event.eventType]} opacity-50`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700">
                      {assignment.slot.event.title}
                    </p>
                    <p className="text-sm text-gray-400">
                      {assignment.slot.name} •{" "}
                      {format(
                        parseISO(assignment.slot.event.eventDate),
                        "MMM d, yyyy"
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {pastAssignments.length > 5 && (
                <p className="text-center text-sm text-gray-400 pt-2">
                  +{pastAssignments.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
