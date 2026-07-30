import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Most peer ministers are on iPhones; let the app paint under the notch and
  // keep pinch-zoom available for anyone who needs it.
  viewportFit: "cover",
  themeColor: "#1F346D",
};

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
