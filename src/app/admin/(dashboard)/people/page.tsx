"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Users,
  Phone,
  ChevronRight,
  LinkIcon,
  UserX,
  UserCheck,
} from "lucide-react";

interface PeerMinister {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function PeoplePage() {
  const [people, setPeople] = useState<PeerMinister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    fetchPeople();
  }, [statusFilter]);

  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        role: "peer_minister",
      });
      if (statusFilter !== "all") {
        params.set("active", statusFilter === "active" ? "true" : "false");
      }
      const response = await fetch(`/api/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPeople(data);
      }
    } catch (error) {
      console.error("Error fetching people:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPeople = people.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.phone.includes(searchQuery)
  );

  const formatPhone = (phone: string) => {
    // Format +19085551234 to (908) 555-1234
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-navy">
            Peer Ministers
          </h1>
          <p className="text-gray-500 mt-1">
            Manage peer ministers and their assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/people/invite">
              <LinkIcon className="mr-2 h-4 w-4" />
              Invite Link
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/people/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Person
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-navy/10">
                <Users className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">
                  {people.filter((p) => p.isActive).length}
                </p>
                <p className="text-sm text-gray-500">Active Ministers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {people.length}
                </p>
                <p className="text-sm text-gray-500">Total Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <UserX className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-500">
                  {people.filter((p) => !p.isActive).length}
                </p>
                <p className="text-sm text-gray-500">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* People List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredPeople.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No peer ministers found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== "active"
                ? "Try adjusting your filters"
                : "Get started by adding your first peer minister"}
            </p>
            {!searchQuery && statusFilter === "active" && (
              <div className="flex justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/people/invite">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Generate Invite
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/admin/people/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Person
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPeople.map((person) => (
            <Card
              key={person.id}
              className="hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <CardContent className="p-0">
                <Link href={`/admin/people/${person.id}`}>
                  <div className="flex items-center p-4 sm:p-5">
                    {/* Avatar */}
                    <div className="flex-shrink-0 mr-4">
                      <div className="h-12 w-12 rounded-full bg-navy flex items-center justify-center">
                        <span className="text-lg font-medium text-white">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {person.name}
                        </h3>
                        {!person.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Phone className="mr-1 h-4 w-4" />
                          {formatPhone(person.phone)}
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
