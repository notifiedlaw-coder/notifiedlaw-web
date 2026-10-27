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
