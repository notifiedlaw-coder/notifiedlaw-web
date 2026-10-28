import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { PRIVATE_PATHS } from "./src/lib/site";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep the dev badge off the sidebar's user card.
  devIndicators: { position: "bottom-right" },
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "www.notifiedlaw.com" }],
      destination: "https://notifiedlaw.com/:path*",
      permanent: true,
    }];
  },
  async headers() {
    return [{
      // Checkout and plan changes act on a click, so no other site may frame the app.
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }, {
      source: `/:path(${PRIVATE_PATHS.map((p) => p.slice(1)).join("|")})/:rest*`,
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Exposes Cloudflare bindings (the VIDEOS R2 bucket) to `next dev`, using local simulated storage.
initOpenNextCloudflareForDev();
