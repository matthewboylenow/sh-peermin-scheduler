"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Bell,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from "lucide-react";

// Sample data for SMS preview
const SAMPLE_DATA = {
  name: "Sarah",
  role: "Greeter",
  event: "Sunday Mass",
  date: "January 15, 2025",
  time: "10:00 AM",
  location: "Saint Helen Parish",
};

// Available placeholder chips
const PLACEHOLDERS = [
  { key: "{name}", label: "Name", description: "Volunteer's name" },
  { key: "{role}", label: "Role", description: "Assigned role/position" },
  { key: "{event}", label: "Event", description: "Event title" },
  { key: "{date}", label: "Date", description: "Event date" },
  { key: "{time}", label: "Time", description: "Event start time" },
  { key: "{location}", label: "Location", description: "Event location" },
];

// Reminder day options
const REMINDER_OPTIONS = [
  { days: 1, label: "1 day before" },
  { days: 2, label: "2 days before" },
  { days: 3, label: "3 days before" },
  { days: 5, label: "5 days before" },
  { days: 7, label: "1 week before" },
];

function generatePreview(template: string): string {
  let preview = template;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    preview = preview.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return preview;
}

function countSmsSegments(text: string): { chars: number; segments: number } {
  const chars = text.length;
  if (chars <= 160) return { chars, segments: 1 };
  return { chars, segments: Math.ceil(chars / 153) };
}

export default function SettingsPage() {
  const { data: session } = useSession();

  // SMS Settings State
  const [reminderDays, setReminderDays] = useState<number[]>([1]);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [isLoadingSms, setIsLoadingSms] = useState(true);
  const [isSavingSms, setIsSavingSms] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [smsSuccess, setSmsSuccess] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Fetch SMS settings on mount
  useEffect(() => {
    fetchSmsSettings();
  }, []);

  const fetchSmsSettings = async () => {
    try {
      setIsLoadingSms(true);
      const response = await fetch("/api/settings/sms");
      if (response.ok) {
        const data = await response.json();
        setReminderDays(data.reminderDays || [1]);
        setMessageTemplate(data.messageTemplate || "");
      }
    } catch (error) {
      console.error("Error fetching SMS settings:", error);
      setSmsError("Failed to load SMS settings");
    } finally {
      setIsLoadingSms(false);
    }
  };

  const handleReminderDayToggle = (days: number) => {
    setReminderDays((prev) => {
      if (prev.includes(days)) {
        // Don't allow removing the last day
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== days);
      } else {
        // Max 5 selections
        if (prev.length >= 5) return prev;
        return [...prev, days].sort((a, b) => a - b);
      }
    });
  };

  const insertPlaceholder = (placeholder: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText =
      messageTemplate.substring(0, start) +
      placeholder +
      messageTemplate.substring(end);

    setMessageTemplate(newText);

    // Set cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + placeholder.length,
        start + placeholder.length
      );
    }, 0);
  };

  const handleSaveSmsSettings = async () => {
    setSmsError("");
    setSmsSuccess("");

    if (reminderDays.length === 0) {
      setSmsError("Please select at least one reminder day");
      return;
    }

    if (!messageTemplate.includes("{name}")) {
      setSmsError("Message template must include the {name} placeholder");
      return;
    }

    if (messageTemplate.length < 10) {
      setSmsError("Message template is too short");
      return;
    }

    setIsSavingSms(true);

    try {
      const response = await fetch("/api/settings/sms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderDays, messageTemplate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSmsSuccess("SMS settings saved successfully!");
      setTimeout(() => setSmsSuccess(""), 3000);
    } catch (error) {
      setSmsError(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSavingSms(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Failed to change password"
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const preview = generatePreview(messageTemplate);
  const { chars, segments } = countSmsSegments(preview);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy">Settings</h1>
        <p className="text-gray-500">
          Configure SMS reminders and account settings
        </p>
      </div>

      {/* SMS Reminder Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rust/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-rust" />
            </div>
            <div>
              <CardTitle>SMS Reminder Schedule</CardTitle>
              <CardDescription>
                Choose when to send SMS reminders to volunteers before their
                scheduled events
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSms ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {REMINDER_OPTIONS.map((option) => (
                  <label
                    key={option.days}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      reminderDays.includes(option.days)
                        ? "border-navy bg-navy/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Checkbox
                      checked={reminderDays.includes(option.days)}
                      onCheckedChange={() => handleReminderDayToggle(option.days)}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>

              {reminderDays.length > 0 && (
                <p className="text-sm text-gray-600">
                  Reminders will be sent:{" "}
                  <span className="font-medium text-navy">
                    {reminderDays
                      .map((d) =>
                        d === 7 ? "1 week" : d === 1 ? "1 day" : `${d} days`
                      )
                      .join(", ")}{" "}
                    before each event
                  </span>
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* SMS Template Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle>Message Template</CardTitle>
              <CardDescription>
                Customize the SMS reminder message. Click placeholders to insert
                them at your cursor position.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingSms ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              {/* Placeholder Chips */}
              <div>
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Available Placeholders
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => insertPlaceholder(p.key)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-navy/10 text-navy hover:bg-navy/20 transition-colors"
                      title={p.description}
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Input */}
              <div className="space-y-2">
                <Label htmlFor="template">Message</Label>
                <Textarea
                  ref={textareaRef}
                  id="template"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Enter your SMS reminder template..."
                  className="min-h-[120px]"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {chars} characters ({segments} SMS segment
                    {segments > 1 ? "s" : ""})
                  </span>
                  {segments > 1 && (
                    <span className="text-amber-600">
                      Multiple segments may incur additional SMS costs
                    </span>
                  )}
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Preview
                </Label>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {preview || (
                      <span className="italic text-gray-400">
                        Enter a template to see preview
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Sample data: {SAMPLE_DATA.name} scheduled as{" "}
                  {SAMPLE_DATA.role} at {SAMPLE_DATA.event}
                </p>
              </div>

              {/* Error/Success Messages */}
              {smsError && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {smsError}
                </div>
              )}
              {smsSuccess && (
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 flex-shrink-0" />
                  {smsSuccess}
                </div>
              )}

              {/* Save Button */}
              <Button
                onClick={handleSaveSmsSettings}
                disabled={isSavingSms}
                className="w-full sm:w-auto"
              >
                {isSavingSms ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save SMS Settings"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security / Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-info" />
            </div>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your admin account password
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {passwordError && (
              <div className="p-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" />
                {passwordSuccess}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={isSavingPassword}>
              {isSavingPassword ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
