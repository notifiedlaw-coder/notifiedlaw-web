import { and, asc, eq } from "drizzle-orm";
import { cmsEntry } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { LEVELS, type Course, type Level } from "@/lib/data";

// All study content comes from Notion, synced into the cms_entry table (see src/lib/notion/sync.ts).
// Nothing is built in: when D1 has no rows, or cannot be read, the pages show an empty state.
// These call the Cloudflare binding, so a page using them is rendered on request, not at build time.

const PALETTE = ["#007AFF", "#34C759", "#FF9500", "#AF52DE", "#30B0C7", "#FF3B30", "#5856D6", "#A2845E"];
type Entry = typeof cmsEntry.$inferSelect;

async function entries(kind: string, onlyPublished: boolean): Promise<Entry[]> {
  try {
    return await getDb().select().from(cmsEntry)
      .where(onlyPublished ? and(eq(cmsEntry.kind, kind), eq(cmsEntry.published, true)) : eq(cmsEntry.kind, kind))
      .orderBy(asc(cmsEntry.position));
  } catch {
    return [];
  }
}

const isLevel = (v: string | null): v is Level => LEVELS.includes(v as Level);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const readMins = (s: string) => Math.max(1, Math.round(words(s) / 200));
const parse = (e: Entry): Record<string, unknown> => { try { return JSON.parse(e.props) as Record<string, unknown>; } catch { return {}; } };

/** A Notion column by name, ignoring case, as text. Multi-select columns give their first value. */
function text(props: Record<string, unknown>, ...names: string[]): string {
  for (const n of names) {
    const key = Object.keys(props).find((k) => k.toLowerCase() === n.toLowerCase());
    const v = key ? props[key] : undefined;
    const s = Array.isArray(v) ? String(v[0] ?? "") : v == null ? "" : String(v);
    if (s.trim()) return s.trim();
  }
  return "";
}
function list(props: Record<string, unknown>, name: string): string[] {
  const key = Object.keys(props).find((k) => k.toLowerCase() === name.toLowerCase());
  const v = key ? props[key] : undefined;
  return Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
}
/** The first plain paragraph of a Markdown body, used when a row has no summary column. */
const lead = (md: string) => (md.split(/\n{2,}/).map((p) => p.trim()).find((p) => p && !/^(#|[-*>|`\d])/.test(p)) ?? "").replace(/[*_`[\]]/g, "").slice(0, 240);
const dateOf = (e: Entry, p: Record<string, unknown>) => {
  const raw = text(p, "Date", "Published");
  const d = raw ? new Date(raw) : e.notionEditedAt ? new Date(e.notionEditedAt) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** Courses and their topics from Notion, grouped by level. A topic is `ready` once it has published text. */
export async function getCourses(): Promise<Record<Level, Course[]>> {
  const out = Object.fromEntries(LEVELS.map((l) => [l, [] as Course[]])) as Record<Level, Course[]>;
  const [courses, topics] = await Promise.all([entries("course", true), entries("topic", false)]);
  for (const c of courses) {
    if (!isLevel(c.level)) continue;
    const mine = topics.filter((t) => t.parentId === c.id).sort((a, b) => a.position - b.position);
    out[c.level].push({
      slug: c.slug, title: c.title, semester: c.semester ?? "1", color: PALETTE[out[c.level].length % PALETTE.length],
      topics: mine.map((t) => ({ title: t.title, ready: t.published, mins: readMins(t.body), chapters: Math.max(1, (t.body.match(/^## /gm) ?? []).length) })),
    });
  }
  return out;
}

export function findIn(courses: Record<Level, Course[]>, slug: string) {
  for (const level of LEVELS) {
    const course = courses[level].find((c) => c.slug === slug);
    if (course) return { course, level };
  }
  return null;
}

/** The published Notion text of topic number `n` (1-based) of a course, or null when it is not live. */
export async function getTopicBody(courseSlug: string, n: number): Promise<{ title: string; body: string } | null> {
  const courses = await entries("course", true);
  const c = courses.find((x) => x.slug === courseSlug);
  if (!c) return null;
  const topics = (await entries("topic", false)).filter((t) => t.parentId === c.id).sort((a, b) => a.position - b.position);
  const t = topics[n - 1];
  return t?.published ? { title: t.title, body: t.body } : null;
}

export type CmsCase = { id: string; slug: string; title: string; cite: string; court: string; jurisdiction: string[]; courses: string[]; body: string };

/** Published case briefs. The Notion columns are CASE NAME, CITATION, COURT, JURISDICTION and COURSE. */
export async function getCaseBriefs(): Promise<CmsCase[]> {
  return (await entries("case", true)).map((e) => {
    const p = parse(e);
    return { id: e.id, slug: e.slug, title: e.title, cite: text(p, "Citation"), court: text(p, "Court"), jurisdiction: list(p, "Jurisdiction"), courses: list(p, "Course"), body: e.body };
  });
}

export type CmsArticle = { slug: string; title: string; summary: string; area: string; industry: string; date: Date | null; mins: number; body: string };

/** Published articles. Optional Notion columns: SUMMARY, AREA, INDUSTRY, DATE. */
export async function getArticles(): Promise<CmsArticle[]> {
  return (await entries("article", true)).map((e) => {
    const p = parse(e);
    return { slug: e.slug, title: e.title, summary: text(p, "Summary", "Description") || lead(e.body), area: text(p, "Area", "Category", "Topic"), industry: text(p, "Industry"), date: dateOf(e, p), mins: readMins(e.body), body: e.body };
  });
}

export type CmsEpisode = { slug: string; n: number; title: string; blurb: string; area: string; date: Date | null; mins: number; body: string };

/** Published Hot Topics write-ups, newest first. Optional Notion columns: EPISODE, SUMMARY, AREA, DATE. */
export async function getEpisodes(): Promise<CmsEpisode[]> {
  const rows = (await entries("episode", true)).map((e, i) => {
    const p = parse(e);
    const n = Number(text(p, "Episode", "Number", "No")) || i + 1;
    return { slug: e.slug, n, title: e.title, blurb: text(p, "Summary", "Description") || lead(e.body), area: text(p, "Area", "Category", "Topic"), date: dateOf(e, p), mins: readMins(e.body), body: e.body };
  });
  return rows.sort((a, b) => b.n - a.n);
}

export type CmsQuestion = { id: string; title: string; course: string; body: string };

/** Published mock questions. The question text is the page body; an optional COURSE column groups them. */
export async function getQuestions(): Promise<CmsQuestion[]> {
  return (await entries("question", true)).map((e) => ({ id: e.id, title: e.title, course: text(parse(e), "Course"), body: e.body }));
}
