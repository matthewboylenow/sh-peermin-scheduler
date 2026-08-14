import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Youth Ministry Calendar",
  description: "Upcoming Saint Helen youth ministry events.",
  // An embed shouldn't compete with the host page in search results.
  robots: { index: false, follow: false },
};

/**
 * Shell for embedded views.
 *
 * The root layout supplies <html>/<body>; this just drops the app chrome so
 * what lands inside the parish site's iframe is the calendar and nothing else.
 */
export default function EmbedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-0">{children}</div>;
}
