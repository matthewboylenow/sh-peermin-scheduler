"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { ArrowLeft, User, Mail, Phone, Lock, Shield, ShieldCheck } from "lucide-react";

export default function NewAdminPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");

  // Only super admins can create admins
  if (session && session.user.role !== "super_admin") {
    return (
      <div className="space-y-6 max-w-2xl">
        <Link
          href="/admin/admins"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admins
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Access Denied
            </h3>
            <p className="text-gray-500">
              Only Super Admins can create new admin accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate phone (if provided)
    const phoneDigits = phone.replace(/\D/g, "");
    if (phone && phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          ...(phoneDigits && { phone: phoneDigits }),
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create admin");
      }

      router.push(`/admin/admins/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/admins"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admins
        </Link>
        <h1 className="font-heading text-3xl font-bold text-navy">
          Add Admin
        </h1>
        <p className="text-gray-500 mt-1">
          Create a new administrator account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Enter the administrator&apos;s details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                This will be used for login
              </p>
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

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Set up login credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role & Permissions</CardTitle>
            <CardDescription>
              Choose the administrator role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Admin Role *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "super_admin")}>
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

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Role Permissions:</h4>
              {role === "super_admin" ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Full access to all features</li>
                  <li>- Can create, edit, and deactivate admin accounts</li>
                  <li>- Can manage system settings</li>
                  <li>- All standard admin permissions</li>
                </ul>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Manage events and schedules</li>
                  <li>- Manage peer ministers</li>
                  <li>- Send reminders</li>
                  <li>- View and export data</li>
                  <li>- Cannot manage other admin accounts</li>
                </ul>
              )}
            </div>
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
              "Create Admin"
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
