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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Plus,
  X,
  Search,
  AlertCircle,
} from "lucide-react";

interface Assignment {
  id: string;
  user: {
    id: string;
    name: string;
    phone: string;
  };
}

interface Slot {
  id: string;
  name: string;
  capacity: number;
  notes: string | null;
  assignments: Assignment[];
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
  recurrenceType: string;
  slots: Slot[];
  creator: {
    id: string;
    name: string;
  };
  childEvents?: { id: string; eventDate: string }[];
}

interface PeerMinister {
  id: string;
  name: string;
  phone: string;
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

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlotName, setNewSlotName] = useState("");
  const [newSlotCapacity, setNewSlotCapacity] = useState(1);

  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [peerMinisters, setPeerMinisters] = useState<PeerMinister[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentWarning, setAssignmentWarning] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      } else if (response.status === 404) {
        router.push("/admin/events");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPeerMinisters = async () => {
    try {
      const response = await fetch("/api/users?role=peer_minister&active=true");
      if (response.ok) {
        const data = await response.json();
        setPeerMinisters(data);
      }
    } catch (error) {
      console.error("Error fetching peer ministers:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/admin/events");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlotName.trim()) return;

    try {
      const response = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: id,
          name: newSlotName,
          capacity: newSlotCapacity,
        }),
      });

      if (response.ok) {
        setShowAddSlot(false);
        setNewSlotName("");
        setNewSlotCapacity(1);
        fetchEvent();
      }
    } catch (error) {
      console.error("Error adding slot:", error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this slot?")) return;

    try {
      const response = await fetch(`/api/slots/${slotId}`, { method: "DELETE" });
      if (response.ok) {
        fetchEvent();
      }
    } catch (error) {
      console.error("Error deleting slot:", error);
    }
  };

  const openAssignModal = (slot: Slot) => {
    setSelectedSlot(slot);
    setSearchQuery("");
    setAssignmentWarning(null);
    setAssignModalOpen(true);
    fetchPeerMinisters();
  };

  const handleAssign = async (userId: string) => {
    if (!selectedSlot) return;

    setIsAssigning(true);
    setAssignmentWarning(null);

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.warnings && data.warnings.length > 0) {
          setAssignmentWarning(data.warnings[0]);
        }
        fetchEvent();
        // Keep modal open to allow more assignments
      } else {
        alert(data.error || "Failed to assign");
      }
    } catch (error) {
      console.error("Error creating assignment:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchEvent();
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
    }
  };

  // Filter peer ministers based on search and exclude already assigned
  const filteredPeerMinisters = peerMinisters.filter((pm) => {
    const matchesSearch =
      pm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pm.phone.includes(searchQuery);
    const alreadyAssigned = selectedSlot?.assignments.some(
      (a) => a.user.id === pm.id
    );
    return matchesSearch && !alreadyAssigned;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  const totalCapacity = event.slots.reduce((sum, slot) => sum + slot.capacity, 0);
  const totalAssigned = event.slots.reduce(
    (sum, slot) => sum + slot.assignments.length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/events"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-3xl font-bold text-navy">
                {event.title}
              </h1>
              <Badge className={eventTypeColors[event.eventType] || ""}>
                {eventTypeLabels[event.eventType] || event.eventType}
              </Badge>
            </div>
            {event.description && (
              <p className="text-gray-500">{event.description}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/admin/events/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-navy/10">
                <Calendar className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {format(parseISO(event.eventDate), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rust/10">
                <Clock className="h-5 w-5 text-rust" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">
                  {event.startTime}
                  {event.endTime && ` - ${event.endTime}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <MapPin className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{event.location || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staffing Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staffing
              </CardTitle>
              <CardDescription>
                {totalAssigned} of {totalCapacity} positions filled
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddSlot(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-navy to-rust transition-all"
                style={{
                  width: `${totalCapacity > 0 ? (totalAssigned / totalCapacity) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Add Slot Form */}
          {showAddSlot && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Slot Name</Label>
                  <Input
                    value={newSlotName}
                    onChange={(e) => setNewSlotName(e.target.value)}
                    placeholder="e.g., Greeter"
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSlotCapacity}
                    onChange={(e) =>
                      setNewSlotCapacity(parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <Button onClick={handleAddSlot}>Add</Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddSlot(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Slots List */}
          {event.slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No slots defined for this event.</p>
              <p className="text-sm mt-1">
                Add slots to start assigning peer ministers.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {event.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900">{slot.name}</h4>
                      <Badge variant="secondary">
                        {slot.assignments.length}/{slot.capacity}
                      </Badge>
                      {slot.assignments.length < slot.capacity && (
                        <Badge variant="warning">Needs more</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignModal(slot)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-error"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {slot.notes && (
                    <p className="text-sm text-gray-500 mb-3">{slot.notes}</p>
                  )}

                  {slot.assignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slot.assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                        >
                          <span>{assignment.user.name}</span>
                          <button
                            className="text-gray-400 hover:text-error"
                            onClick={() => handleRemoveAssignment(assignment.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      No one assigned yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Events Info */}
      {event.recurrenceType !== "none" &&
        event.childEvents &&
        event.childEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recurring Instances</CardTitle>
              <CardDescription>
                This event repeats {event.recurrenceType}. There are{" "}
                {event.childEvents.length} additional instances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {event.childEvents.slice(0, 10).map((child) => (
                  <Link
                    key={child.id}
                    href={`/admin/events/${child.id}`}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                  >
                    {format(parseISO(child.eventDate), "MMM d")}
                  </Link>
                ))}
                {event.childEvents.length > 10 && (
                  <span className="px-3 py-1.5 text-sm text-gray-500">
                    +{event.childEvents.length - 10} more
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Assignment Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Peer Minister</DialogTitle>
            <DialogDescription>
              Select a peer minister to assign to {selectedSlot?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {assignmentWarning && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{assignmentWarning}</span>
              </div>
            )}

            {/* Currently Assigned */}
            {selectedSlot && selectedSlot.assignments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider">
                  Currently Assigned
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedSlot.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-navy/10 rounded-full text-sm"
                    >
                      <span>{assignment.user.name}</span>
                      <button
                        className="text-gray-500 hover:text-error"
                        onClick={() => {
                          handleRemoveAssignment(assignment.id);
                          // Update local state to reflect removal
                          if (selectedSlot) {
                            setSelectedSlot({
                              ...selectedSlot,
                              assignments: selectedSlot.assignments.filter(
                                (a) => a.id !== assignment.id
                              ),
                            });
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search peer ministers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Peer Minister List */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredPeerMinisters.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery
                    ? "No matching peer ministers found"
                    : "All peer ministers are already assigned"}
                </p>
              ) : (
                filteredPeerMinisters.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => handleAssign(pm.id)}
                    disabled={isAssigning}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{pm.name}</p>
                      <p className="text-sm text-gray-500">{pm.phone}</p>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
