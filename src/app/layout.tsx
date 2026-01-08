import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Saint Helen Peer Ministry Scheduler",
    template: "%s | Saint Helen Peer Ministry",
  },
  description:
    "Scheduling and coordination platform for Saint Helen Parish Peer Ministry program.",
  keywords: ["peer ministry", "saint helen", "parish", "scheduling", "volunteer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
