import Link from "next/link";
import { Container } from "./Container";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-cream">
      <Container>
        <div className="py-8 md:py-12">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-10 w-10 overflow-hidden rounded-full bg-navy">
                  <div className="flex h-full w-full items-center justify-center text-white font-heading font-bold text-lg">
                    SH
                  </div>
                </div>
                <div>
                  <p className="font-heading font-bold text-navy">Saint Helen Parish</p>
                  <p className="text-xs text-gray-500">Peer Ministry Program</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 max-w-xs">
                Empowering young people to serve and lead in our faith community.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-heading font-semibold text-navy mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/schedule"
                    className="text-sm text-gray-600 hover:text-navy transition-colors"
                  >
                    View Schedule
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-gray-600 hover:text-navy transition-colors"
                  >
                    Peer Minister Portal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/login"
                    className="text-sm text-gray-600 hover:text-navy transition-colors"
                  >
                    Admin Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-heading font-semibold text-navy mb-4">Contact</h3>
              <address className="not-italic text-sm text-gray-600 space-y-1">
                <p>Saint Helen Parish</p>
                <p>Westfield, NJ</p>
              </address>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              &copy; {currentYear} Saint Helen Parish. All rights reserved.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
