import type { MetadataRoute } from "next";
import { getArticles, getCaseBriefs, getCourses } from "@/lib/cms";
import { LEVELS, PREVIEW_TOPICS, isMaxLevel } from "@/lib/data";
import { abs } from "@/lib/site";

// Content comes from Notion (D1), so the sitemap is built on request.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [courses, articles, cases] = await Promise.all([getCourses(), getArticles(), getCaseBriefs()]);
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly" = "monthly", lastModified = now) => ({ url: abs(path), lastModified, changeFrequency, priority });
  return [
    page("/", 1, "weekly"),
    page("/signup", 0.6, "yearly"),
    page("/privacy", 0.3, "yearly"),
    page("/terms-of-service", 0.3, "yearly"),
    page("/library", 0.8, "weekly"),
    ...LEVELS.flatMap((l) => courses[l]).map((c) => page(`/library/${c.slug}`, 0.6)),
    // Only the open preview topics carry text a crawler can read.
    ...LEVELS.filter((l) => !isMaxLevel(l)).flatMap((l) => courses[l]).flatMap((c) =>
      c.topics.slice(0, PREVIEW_TOPICS).flatMap((t, i) => (t.ready ? [page(`/library/${c.slug}/${i + 1}`, 0.5)] : []))),
    page("/articles", 0.8, "weekly"),
    ...articles.map((a) => page(`/articles/${a.slug}`, 0.8, "monthly", a.date ?? now)),
    page("/case-law", 0.8, "weekly"),
    ...cases.map((c) => page(`/case-law/${c.slug}`, 0.7)),
  ];
}
