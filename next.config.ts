import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { PRIVATE_PATHS } from "./src/lib/site";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep the dev badge off the sidebar's user card.
  devIndicators: { position: "bottom-right" },
  // Dev only: lets a phone on the same Wi-Fi load the app's scripts from this Mac (by its local IP or .local name).
  // Without it the dev server answers 403 to them and the page arrives without JavaScript.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
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
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        // The microphone is for voice calls and dictation, on this site only.
        { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
