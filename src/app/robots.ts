import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, abs } from "@/lib/site";

// Search and answer-engine crawlers are welcome: being cited by AI assistants is a goal.
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User", "anthropic-ai",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "CCBot", "Bytespider", "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE_PATHS.map((p) => p + "/");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS, ...disallow, "/api/"] },
      { userAgent: AI_BOTS, allow: "/", disallow: [...PRIVATE_PATHS, ...disallow, "/api/"] },
    ],
    sitemap: abs("/sitemap.xml"),
    host: abs("/"),
  };
}
