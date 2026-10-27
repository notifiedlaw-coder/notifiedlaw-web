import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Keep the dev badge off the sidebar's user card.
  devIndicators: { position: "bottom-right" },
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
