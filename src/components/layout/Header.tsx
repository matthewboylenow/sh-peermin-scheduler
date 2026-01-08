"use client";

import Link from "next/link";
import Image from "next/image";
import { Container } from "./Container";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-auto">
              <Image
                src="/saint-helen-logo.png"
                alt="Saint Helen Parish"
                width={178}
                height={30}
                className="h-8 w-auto brightness-0"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/schedule"
              className="text-sm font-medium text-gray-600 hover:text-navy transition-colors"
            >
              View Schedule
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-navy transition-colors"
            >
              Peer Minister Login
            </Link>
            <Button asChild size="sm">
              <Link href="/admin/login">Admin Login</Link>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-navy"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 space-y-3 border-t border-gray-200">
            <Link
              href="/schedule"
              className="block text-sm font-medium text-gray-600 hover:text-navy transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              View Schedule
            </Link>
            <Link
              href="/login"
              className="block text-sm font-medium text-gray-600 hover:text-navy transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Peer Minister Login
            </Link>
            <Button asChild size="sm" className="w-full">
              <Link href="/admin/login">Admin Login</Link>
            </Button>
          </nav>
        )}
      </Container>
    </header>
  );
}
