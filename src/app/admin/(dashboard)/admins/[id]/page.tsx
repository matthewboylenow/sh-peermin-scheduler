"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Save,
  Shield,
  ShieldCheck,
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
  notificationsEnabled: boolean;
  createdAt: string;
}

export default function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Edit form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isOwnProfile = session?.user?.id === id;
  const canEdit = isSuperAdmin || isOwnProfile;
  const canChangeRole = isSuperAdmin && !isOwnProfile;

  useEffect(() => {
    fetchAdmin();
  }, [id]);

  const fetchAdmin = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admins/${id}`);
      if (response.ok) {
        const data = await response.json();
        setAdmin(data);
        setName(data.name);
        setEmail(data.email || "");
        setPhone(data.phone ? formatPhoneDisplay(data.phone) : "");
        setRole(data.role);
      } else if (response.status === 404) {
        router.push("/admin/admins");
      }
    } catch (error) {
      console.error("Error fetching admin:", error);
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
    if (phone && phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSaving(true);

    try {
      const updateData: Record<string, string | boolean | null> = {
        name,
        email,
        phone: phoneDigits || null,
      };

      if (newPassword) {
        updateData.password = newPassword;
      }

      if (canChangeRole) {
        updateData.role = role;
      }

      const response = await fetch(`/api/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update");
      }

      setAdmin((prev) =>
        prev
          ? {
              ...prev,
              name,
              email,
              phone: data.phone,
              role: data.role,
            }
          : null
      );
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Changes saved successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!admin) return;

    const action = admin.isActive ? "deactivate" : "reactivate";
    if (
      !confirm(
        `Are you sure you want to ${action} ${admin.name}? ${
          admin.isActive
            ? "They will no longer be able to log in."
            : "They will be able to log in again."
        }`
      )
    ) {
      return;
    }

    setIsToggling(true);

    try {
      const response = await fetch(`/api/admins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !admin.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setAdmin((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Admin not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/admins"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admins
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`h-16 w-16 rounded-full flex items-center justify-center ${
                admin.role === "super_admin" ? "bg-navy" : "bg-rust"
              }`}
            >
              {admin.role === "super_admin" ? (
                <ShieldCheck className="h-8 w-8 text-white" />
              ) : (
                <Shield className="h-8 w-8 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-3xl font-bold text-navy">
                  {admin.name}
                </h1>
                <Badge
                  variant={admin.role === "super_admin" ? "default" : "secondary"}
                >
                  {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                </Badge>
                {!admin.isActive && <Badge variant="outline">Inactive</Badge>}
                {isOwnProfile && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    You
                  </Badge>
                )}
              </div>
              <p className="text-gray-500">
                Member since {format(parseISO(admin.createdAt), "MMMM yyyy")}
              </p>
            </div>
          </div>

          {isSuperAdmin && !isOwnProfile && (
            <Button
              variant={admin.isActive ? "outline" : "default"}
              onClick={handleToggleActive}
              disabled={isToggling}
            >
              {isToggling ? (
                <Spinner size="sm" />
              ) : admin.isActive ? (
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
          )}
        </div>
      </div>

      {!canEdit ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              View Only
            </h3>
            <p className="text-gray-500">
              Only Super Admins can edit other admin accounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Information */}
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
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(908) 555-1234"
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Update password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role (only for super admins editing other admins) */}
          {canChangeRole && (
            <Card>
              <CardHeader>
                <CardTitle>Role & Permissions</CardTitle>
                <CardDescription>Change administrator role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Admin Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as "admin" | "super_admin")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-rust" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="super_admin">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-navy" />
                          Super Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">
                    {role === "super_admin" ? "Super Admin" : "Admin"} can:
                  </h4>
                  {role === "super_admin" ? (
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>- Full access to all features</li>
                      <li>- Create and manage admin accounts</li>
                      <li>- Change system settings</li>
                    </ul>
                  ) : (
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>- Manage events and schedules</li>
                      <li>- Manage peer ministers</li>
                      <li>- Cannot manage other admins</li>
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="lg:col-span-2">
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
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
          </div>
        </div>
      )}
    </div>
  );
}
