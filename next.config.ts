import type { NextConfig } from "next";

/**
 * Sites allowed to embed /embed/* in an iframe.
 *
 * Everything else in the app stays unframeable. Add hosts here rather than
 * loosening the default: an admin page inside someone else's iframe is a
 * clickjacking target, and these routes are the only ones meant to be
 * borrowed.
 *
 * Set EMBED_ALLOWED_ORIGINS (comma-separated, e.g.
 * "https://staging.example.org,https://www.example.com") to add more without a
 * code change — useful when the parish site moves or is previewed elsewhere.
 * Local addresses are allowed outside production so the embed can be tested
 * against a page served from disk.
 */
const embedAncestors = [
  "'self'",
  "https://sainthelen.org",
  "https://*.sainthelen.org",
  ...(process.env.EMBED_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:*", "http://127.0.0.1:*"]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${embedAncestors.join(" ")};`,
          },
        ],
      },
      {
        // The public calendar feed is read-only and identical for everyone, so
        // the parish site may fetch it directly if it ever wants to render its
        // own view instead of using the iframe.
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
      {
        // Everything else: refuse framing outright.
        source: "/((?!embed).*)",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
