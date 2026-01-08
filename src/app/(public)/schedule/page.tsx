"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, Clock, MapPin, Users, ChevronDown } from "lucide-react";

interface PublicEvent {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  slots: {
    id: string;
    name: string;
    capacity: number;
    assignedCount: number;
    assignees: { name: string }[];
  }[];
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

export default function PublicSchedulePage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSchedule();
  }, [filter]);

  const fetchSchedule = async () => {
    try {
      setIsLoading(true);
      const url = filter
        ? `/api/public/schedule?eventType=${filter}`
        : "/api/public/schedule";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching schedule:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEEE, MMM d");
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = event.eventDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, PublicEvent[]>);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Image
                src="/saint-helen-logo.png"
                alt="Saint Helen Parish"
                width={160}
                height={27}
                className="h-7 w-auto brightness-0"
                priority
              />
            </Link>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Peer Minister Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="font-heading text-3xl font-bold text-navy">
              Ministry Schedule
            </h1>
            <p className="text-gray-600 mt-1">
              Upcoming events and volunteer assignments
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(null)}
            >
              All
            </Button>
            {Object.entries(eventTypeLabels).map(([value, label]) => (
              <Button
                key={value}
                variant={filter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Events List */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming events</p>
                <p className="text-sm text-gray-400 mt-1">
                  Check back later for new events
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                <div key={date}>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {getDateLabel(date)}
                  </h2>
                  <div className="space-y-3">
                    {dateEvents.map((event) => (
                      <Card key={event.id} className="overflow-hidden">
                        <div
                          className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleEventExpanded(event.id)}
                        >
                          <div
                            className={`w-1.5 h-full min-h-16 rounded-full ${eventTypeColors[event.eventType]}`}
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {event.title}
                                </h3>
                                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {event.startTime}
                                    {event.endTime && ` - ${event.endTime}`}
                                  </span>
                                  {event.location && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={eventTypeColors[event.eventType]}>
                                  {eventTypeLabels[event.eventType]}
                                </Badge>
                                <ChevronDown
                                  className={`h-5 w-5 text-gray-400 transition-transform ${
                                    expandedEvents.has(event.id) ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Slots Summary */}
                            <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                              <Users className="h-4 w-4" />
                              <span>
                                {event.slots.reduce((sum, s) => sum + s.assignedCount, 0)} /{" "}
                                {event.slots.reduce((sum, s) => sum + s.capacity, 0)} volunteers
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedEvents.has(event.id) && (
                          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Volunteer Assignments
                            </h4>
                            <div className="space-y-2">
                              {event.slots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="flex items-start justify-between text-sm"
                                >
                                  <div>
                                    <span className="font-medium text-gray-800">
                                      {slot.name}
                                    </span>
                                    {slot.assignees.length > 0 && (
                                      <p className="text-gray-600">
                                        {slot.assignees.map((a) => a.name).join(", ")}
                                      </p>
                                    )}
                                  </div>
                                  <Badge
                                    variant={
                                      slot.assignedCount >= slot.capacity
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      slot.assignedCount >= slot.capacity
                                        ? "bg-success"
                                        : ""
                                    }
                                  >
                                    {slot.assignedCount}/{slot.capacity}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6 max-w-4xl text-center text-sm text-gray-500">
          <p>Saint Helen Catholic Church</p>
          <p className="mt-1">Peer Ministry Scheduler</p>
        </div>
      </footer>
    </div>
  );
}
