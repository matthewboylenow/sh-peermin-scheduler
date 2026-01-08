"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  LinkIcon,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Send,
} from "lucide-react";
import { format } from "date-fns";

interface InviteLink {
  inviteUrl: string;
  token: string;
  expiresAt: string;
}

export default function InvitePage() {
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generateInvite = async () => {
    setError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate invite");
      }

      const data = await response.json();
      setInviteLink(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareViaEmail = () => {
    if (!inviteLink) return;

    const subject = encodeURIComponent("Join Saint Helen Peer Ministry");
    const body = encodeURIComponent(
      `You've been invited to join the Saint Helen Peer Ministry scheduling system!\n\nClick the link below to register:\n${inviteLink.inviteUrl}\n\nThis link expires on ${format(new Date(inviteLink.expiresAt), "MMMM d, yyyy")}.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaSMS = () => {
    if (!inviteLink) return;

    const body = encodeURIComponent(
      `You've been invited to join Saint Helen Peer Ministry! Register here: ${inviteLink.inviteUrl}`
    );
    window.open(`sms:?body=${body}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href="/admin/people"
          className="inline-flex items-center text-sm text-gray-500 hover:text-navy mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Peer Ministers
        </Link>
        <h1 className="font-heading text-3xl font-bold text-navy">
          Invite Link
        </h1>
        <p className="text-gray-500 mt-1">
          Generate a link to invite new peer ministers
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error">
          {error}
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center mt-0.5">
                1
              </span>
              <span>Generate a unique invite link below</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center mt-0.5">
                2
              </span>
              <span>Share the link with a peer minister via text or email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center mt-0.5">
                3
              </span>
              <span>
                They enter their name and phone number to complete registration
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-navy text-white text-xs flex items-center justify-center mt-0.5">
                4
              </span>
              <span>
                They can now log in and view their schedule!
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Generate Button or Link Display */}
      {!inviteLink ? (
        <Card>
          <CardContent className="py-8 text-center">
            <LinkIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to invite someone?
            </h3>
            <p className="text-gray-500 mb-6">
              Generate a unique link that expires in 7 days
            </p>
            <Button onClick={generateInvite} disabled={isGenerating} size="lg">
              {isGenerating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Generate Invite Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Invite Link Generated
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Expires {format(new Date(inviteLink.expiresAt), "MMMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Link Display */}
            <div className="flex gap-2">
              <Input
                value={inviteLink.inviteUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Share Options */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={shareViaEmail}
              >
                <Send className="mr-2 h-4 w-4" />
                Share via Email
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={shareViaSMS}
              >
                <Send className="mr-2 h-4 w-4" />
                Share via SMS
              </Button>
            </div>

            {/* Generate New */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={() => {
                  setInviteLink(null);
                }}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate New Link
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Each link can only be used once
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative Option */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">
                Need to add someone directly?
              </h4>
              <p className="text-sm text-gray-500">
                You can manually enter their information
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin/people/new">Add Manually</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
