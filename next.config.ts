import type { NextConfig } from "next";

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
