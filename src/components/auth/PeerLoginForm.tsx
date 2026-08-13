"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Phone } from "lucide-react";

export function PeerLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/peer-auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneDigits }),
      });

      const data = await response.json();

      // 429 means a code went out moments ago and the server is refusing to
      // send a second one. That code is still valid and sitting in their
      // messages, so the right move is the code screen — not an error that
      // strands them here. Easy to hit: send a code, tap back, try again.
      if (response.status === 429) {
        router.push(`/verify?phone=${encodeURIComponent(phoneDigits)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      router.push(`/verify?phone=${encodeURIComponent(phoneDigits)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error"
        >
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            placeholder="(908) 555-1234"
            className="h-12 pl-10 text-base"
            required
            autoFocus
          />
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Spinner size="sm" />
            Sending Code...
          </>
        ) : (
          "Send Login Code"
        )}
      </Button>
    </form>
  );
}
