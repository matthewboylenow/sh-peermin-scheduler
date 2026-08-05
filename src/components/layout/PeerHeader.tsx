"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, FolderOpen, HandHeart, Home, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PeerHeaderProps {
  userName: string;
}

export const PEER_NAV = [
  { name: "Home", href: "/my", icon: Home, exact: true },
  { name: "Files", href: "/my/files", icon: FolderOpen, exact: false },
  { name: "Schedule", href: "/my/schedule", icon: Calendar, exact: false },
  { name: "Sign-Ups", href: "/my/opportunities", icon: HandHeart, exact: false },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);
}

export function PeerHeader({ userName }: PeerHeaderProps) {
  const router = useRouter();
  const isActive = useIsActive();

  const handleLogout = async () => {
    await fetch("/api/peer-auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
          <Link href="/my" className="flex flex-shrink-0 items-center">
            <Image
              src="/saint-helen-logo.png"
              alt="Saint Helen Parish"
              width={140}
              height={24}
              className="h-6 w-auto brightness-0"
              priority
            />
          </Link>

          {/* Desktop navigation — phones get the bottom tab bar instead. */}
          <nav className="hidden items-center gap-1 md:flex">
            {PEER_NAV.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href, item.exact)
                    ? "bg-navy/10 text-navy"
                    : "text-gray-600 hover:bg-gray-100 hover:text-navy"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex flex-shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy">
              <span className="text-sm font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden text-sm text-gray-700 sm:inline">
              {userName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-500"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Thumb-reachable navigation for phones. Most peer ministers use the app on an
 * iPhone, so the primary destinations sit at the bottom of the screen rather
 * than behind a hamburger menu.
 */
export function PeerTabBar() {
  const isActive = useIsActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-md">
        {PEER_NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-navy" : "text-gray-500"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className={cn("h-5 w-5", active && "text-navy")} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
