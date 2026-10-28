import type { MetadataRoute } from "next";
import { ARTICLES, CASE_LIST, STATUTE_LIST } from "@/lib/content";
import { COURSES } from "@/lib/data";
import { abs } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const slugged = <T extends { slug?: string }>(xs: readonly T[], base: string) =>
    xs.filter((x) => x.slug).map((x) => ({
      url: abs(`${base}/${x.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [
    { url: abs("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: abs("/signup"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/terms-of-service"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: abs("/library"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...Object.values(COURSES).flat().map((c) => ({
      url: abs(`/library/${c.slug}`), lastModified: now, changeFrequency: "monthly" as const, priority: 0.6,
    })),
    { url: abs("/articles"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...ARTICLES.map((a) => ({
      url: abs(`/articles/${a.slug}`), lastModified: new Date(a.date), changeFrequency: "monthly" as const, priority: 0.8,
    })),
    { url: abs("/case-law"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...slugged(CASE_LIST, "/case-law"),
    { url: abs("/legislation"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...slugged(STATUTE_LIST, "/legislation"),
  ];
}
