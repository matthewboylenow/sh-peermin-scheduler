"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
} from "lucide-react";

interface Slot {
  id: string;
  name: string;
  capacity: number;
  assignments: { id: string; user: { name: string } }[];
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  slots: Slot[];
}

const eventTypeColors: Record<string, string> = {
  mass: "bg-navy text-white",
  clow: "bg-rust text-white",
  volunteer: "bg-success text-white",
  ministry: "bg-info text-white",
  other: "bg-gray-500 text-white",
};

const eventTypeLabels: Record<string, string> = {
  mass: "Mass",
  clow: "CLOW",
  volunteer: "Volunteer",
  ministry: "Ministry",
  other: "Other",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    fetchEvents();
  }, [typeFilter]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }
      const response = await fetch(`/api/events?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFilledSlots = (slots: Slot[]) => {
    return slots.reduce((total, slot) => total + slot.assignments.length, 0);
  };

  const getTotalCapacity = (slots: Slot[]) => {
    return slots.reduce((total, slot) => total + slot.capacity, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-navy">Events</h1>
          <p className="text-gray-500 mt-1">
            Manage events and assign peer ministers
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mass">Mass</SelectItem>
                <SelectItem value="clow">CLOW</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
                <SelectItem value="ministry">Ministry</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No events found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first event"}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <Button asChild>
                <Link href="/admin/events/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Event
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <CardContent className="p-0">
                <Link href={`/admin/events/${event.id}`}>
                  <div className="flex items-center p-4 sm:p-6">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 w-16 text-center mr-4 sm:mr-6">
                      <div className="text-sm font-medium text-gray-500 uppercase">
                        {format(parseISO(event.eventDate), "MMM")}
                      </div>
                      <div className="text-2xl font-bold text-navy">
                        {format(parseISO(event.eventDate), "d")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(parseISO(event.eventDate), "EEE")}
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {event.title}
                        </h3>
                        <Badge
                          className={eventTypeColors[event.eventType] || ""}
                        >
                          {eventTypeLabels[event.eventType] || event.eventType}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="mr-1 h-4 w-4" />
                          {event.startTime}
                          {event.endTime && ` - ${event.endTime}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center">
                            <MapPin className="mr-1 h-4 w-4" />
                            {event.location}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {getFilledSlots(event.slots)}/
                          {getTotalCapacity(event.slots)} assigned
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="flex-shrink-0 h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
