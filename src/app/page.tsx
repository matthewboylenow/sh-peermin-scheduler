import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PeerLoginForm } from "@/components/auth/PeerLoginForm";
import { getPeerSession } from "@/lib/peer-session";
import { Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
};

/**
 * The root of the app is the peer minister sign-in. Nearly everyone who lands
 * here is a peer minister on a phone, so we skip the marketing page entirely.
 */
export default async function HomePage() {
  const session = await getPeerSession();
  if (session) {
    redirect("/my");
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <main className="flex flex-1 items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Image
              src="/saint-helen-logo.png"
              alt="Saint Helen Parish"
              width={220}
              height={38}
              priority
              className="mx-auto h-10 w-auto brightness-0"
            />
            <p className="mt-3 text-sm font-medium uppercase tracking-wider text-gray-500">
              Peer Ministry
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Enter your phone number and we&apos;ll text you a login code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PeerLoginForm />
            </CardContent>
          </Card>

          <div className="mt-6 space-y-3">
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/admin/login">
                <Lock className="h-4 w-4" />
                Admin Login
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-gray-400">
        Saint Helen Catholic Church
      </footer>
    </div>
  );
}
