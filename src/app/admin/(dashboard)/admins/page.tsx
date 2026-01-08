"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  Shield,
  ShieldCheck,
  Mail,
  ChevronRight,
  UserX,
  UserCheck,
} from "lucide-react";

interface Admin {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "admin" | "super_admin";
  isActive: boolean;
  createdAt: string;
}

export default function AdminsPage() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const isSuperAdmin = session?.user?.role === "super_admin";

  useEffect(() => {
    fetchAdmins();
  }, [statusFilter]);

  const fetchAdmins = async () => {
    try {
      setIsLoading(true);
      // Fetch both admin and super_admin roles
      const [adminRes, superAdminRes] = await Promise.all([
        fetch(`/api/users?role=admin${statusFilter !== "all" ? `&active=${statusFilter === "active"}` : ""}`),
        fetch(`/api/users?role=super_admin${statusFilter !== "all" ? `&active=${statusFilter === "active"}` : ""}`),
      ]);

      if (adminRes.ok && superAdminRes.ok) {
        const adminData = await adminRes.json();
        const superAdminData = await superAdminRes.json();
        const allAdmins = [...superAdminData, ...adminData].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setAdmins(allAdmins);
      }
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.phone?.includes(searchQuery)
  );

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
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
            Manage Admins
          </h1>
          <p className="text-gray-500 mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>
        {isSuperAdmin && (
          <Button asChild>
            <Link href="/admin/admins/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-navy/10">
                <ShieldCheck className="h-5 w-5 text-navy" />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy">
                  {admins.filter((a) => a.role === "super_admin").length}
                </p>
                <p className="text-sm text-gray-500">Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rust/10">
                <Shield className="h-5 w-5 text-rust" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rust">
                  {admins.filter((a) => a.role === "admin").length}
                </p>
                <p className="text-sm text-gray-500">Admins</p>
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
                  {admins.filter((a) => !a.isActive).length}
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
                placeholder="Search by name, email, or phone..."
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

      {/* Admins List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredAdmins.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No admins found
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== "active"
                ? "Try adjusting your filters"
                : "Get started by adding your first admin"}
            </p>
            {!searchQuery && statusFilter === "active" && isSuperAdmin && (
              <Button asChild>
                <Link href="/admin/admins/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Admin
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredAdmins.map((admin) => (
            <Card
              key={admin.id}
              className="hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
            >
              <CardContent className="p-0">
                <Link href={`/admin/admins/${admin.id}`}>
                  <div className="flex items-center p-4 sm:p-5">
                    {/* Avatar */}
                    <div className="flex-shrink-0 mr-4">
                      <div
                        className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          admin.role === "super_admin"
                            ? "bg-navy"
                            : "bg-rust"
                        }`}
                      >
                        {admin.role === "super_admin" ? (
                          <ShieldCheck className="h-6 w-6 text-white" />
                        ) : (
                          <Shield className="h-6 w-6 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {admin.name}
                        </h3>
                        <Badge
                          variant={
                            admin.role === "super_admin" ? "default" : "secondary"
                          }
                        >
                          {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                        </Badge>
                        {!admin.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {admin.email && (
                          <span className="flex items-center">
                            <Mail className="mr-1 h-4 w-4" />
                            {admin.email}
                          </span>
                        )}
                        {admin.phone && (
                          <span className="text-gray-400">
                            {formatPhone(admin.phone)}
                          </span>
                        )}
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

      {/* Info Box for non-super admins */}
      {!isSuperAdmin && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              Only Super Admins can create or modify admin accounts. Contact a
              Super Admin if you need to make changes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
