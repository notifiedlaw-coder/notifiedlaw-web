import { and, asc, eq } from "drizzle-orm";
import { cmsEntry } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { COURSES, LEVELS, type Course, type Level } from "@/lib/data";

// Reads the content synced from Notion (see src/lib/notion/sync.ts). Every function falls back to the built-in
// content when D1 has nothing published or cannot be read, so the site never goes blank. These call the Cloudflare
// binding, so a page using them is rendered on request, not at build time.

const PALETTE = ["#007AFF", "#34C759", "#FF9500", "#AF52DE", "#30B0C7", "#FF3B30", "#5856D6", "#A2845E"];
type Entry = typeof cmsEntry.$inferSelect;

async function published(kind: string): Promise<Entry[]> {
  try {
    return await getDb().select().from(cmsEntry)
      .where(and(eq(cmsEntry.kind, kind), eq(cmsEntry.published, true)))
      .orderBy(asc(cmsEntry.position));
  } catch {
    return [];
  }
}

const isLevel = (v: string | null): v is Level => LEVELS.includes(v as Level);

/** Published topics grouped under their course row, in Notion order. */
async function topicsByCourse() {
  const [courses, topics] = await Promise.all([published("course"), published("topic")]);
  return courses
    .map((course) => ({ course, topics: topics.filter((t) => t.parentId === course.id).sort((a, b) => a.position - b.position) }))
    .filter((g) => g.topics.length > 0);
}

/** The built-in courses, with each course that has published Notion topics using those topics instead. */
export async function getCourses(): Promise<Record<Level, Course[]>> {
  const merged = Object.fromEntries(LEVELS.map((l) => [l, COURSES[l].map((c) => ({ ...c }))])) as Record<Level, Course[]>;
  let added = 0;
  for (const { course, topics } of await topicsByCourse()) {
    if (!isLevel(course.level)) continue;
    const titles = topics.map((t) => t.title);
    const hit = merged[course.level].find((c) => c.slug === course.slug);
    if (hit) hit.topics = titles;
    else {
      const initials = course.title.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 3);
      merged[course.level].push({ slug: course.slug, title: course.title, code: `LAW ${initials}`, color: PALETTE[added++ % PALETTE.length], progress: 0, topics: titles });
    }
  }
  return merged;
}

export function findIn(courses: Record<Level, Course[]>, slug: string) {
  for (const level of LEVELS) {
    const course = courses[level].find((c) => c.slug === slug);
    if (course) return { course, level };
  }
  return null;
}

/** The Notion body of topic number `n` (1-based) of a course, or null when that topic is not from Notion. */
export async function getTopicBody(courseSlug: string, n: number): Promise<{ title: string; body: string } | null> {
  const group = (await topicsByCourse()).find((g) => g.course.slug === courseSlug);
  const t = group?.topics[n - 1];
  return t ? { title: t.title, body: t.body } : null;
}

export type CmsCase = { id: string; slug: string; title: string; cite: string; court: string; jurisdiction: string[]; courses: string[]; body: string };

/** Published case briefs from Notion. The Notion columns are CASE NAME, CITATION, COURT, JURISDICTION and COURSE. */
export async function getCaseBriefs(): Promise<CmsCase[]> {
  const first = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? "") : String(v ?? ""));
  const list = (v: unknown) => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
  return (await published("case")).map((e) => {
    const p = JSON.parse(e.props) as Record<string, unknown>;
    return { id: e.id, slug: e.slug, title: e.title, cite: first(p["CITATION"]), court: first(p["COURT"]), jurisdiction: list(p["JURISDICTION"]), courses: list(p["COURSE"]), body: e.body };
  });
}
