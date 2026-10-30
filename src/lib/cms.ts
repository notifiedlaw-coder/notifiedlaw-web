import { and, asc, eq } from "drizzle-orm";
import { articleTag, cmsEntry } from "@/db/schema";
import { getDb } from "@/lib/auth";
import { LEVELS, type Course, type Level } from "@/lib/data";
import { splitChapters } from "@/components/markdown";

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
export const tagSlug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
      topics: mine.map((t) => ({ id: t.id, title: t.title, ready: t.published, mins: readMins(t.body), chapters: splitChapters(t.body, t.title).length })),
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
export async function getTopicBody(courseSlug: string, n: number): Promise<{ id: string; title: string; body: string } | null> {
  const courses = await entries("course", true);
  const c = courses.find((x) => x.slug === courseSlug);
  if (!c) return null;
  const topics = (await entries("topic", false)).filter((t) => t.parentId === c.id).sort((a, b) => a.position - b.position);
  const t = topics[n - 1];
  return t?.published ? { id: t.id, title: t.title, body: t.body } : null;
}

/** Where a published topic sits, by its Notion page id: its course's level and its number in the course. */
export async function topicPlace(topicId: string): Promise<{ level: Level; n: number } | null> {
  const db = getDb();
  const [t] = await db.select({ parentId: cmsEntry.parentId, published: cmsEntry.published }).from(cmsEntry).where(and(eq(cmsEntry.id, topicId), eq(cmsEntry.kind, "topic")));
  if (!t?.published || !t.parentId) return null;
  const [c] = await db.select({ level: cmsEntry.level, published: cmsEntry.published }).from(cmsEntry).where(eq(cmsEntry.id, t.parentId));
  if (!c?.published || !isLevel(c.level)) return null;
  const siblings = await db.select({ id: cmsEntry.id }).from(cmsEntry).where(and(eq(cmsEntry.kind, "topic"), eq(cmsEntry.parentId, t.parentId))).orderBy(asc(cmsEntry.position));
  return { level: c.level, n: siblings.findIndex((s) => s.id === topicId) + 1 };
}

/** cells: every Notion column but the title, by its name, as a list (a text column gives one value or none). */
export type CmsCase = { id: string; slug: string; title: string; cite: string; court: string; jurisdiction: string[]; courses: string[]; cells: Record<string, string[]>; body: string };

/** Published case briefs. The Notion columns are CASE NAME, CITATION, COURT, JURISDICTION and COURSE. */
export async function getCaseBriefs(): Promise<CmsCase[]> {
  return (await entries("case", true)).map((e) => {
    const p = parse(e);
    const cells = Object.fromEntries(Object.keys(p).filter((k) => !k.startsWith("_")).map((k) => [k, list(p, k).filter((v) => v.trim())]));
    return { id: e.id, slug: e.slug, title: e.title, cite: text(p, "Citation"), court: list(p, "Court").join(", "), jurisdiction: list(p, "Jurisdiction"), courses: list(p, "Course"), cells, body: e.body };
  });
}

/** A column of a Notion database: its name, type (title, rich_text, select, multi_select …) and, for select columns, its options. */
export type CmsColumn = { name: string; type: string; options: string[] };

/**
 * The columns of a section's Notion database (kind "case", "article" …), in Notion's order with the title first, as the
 * last sync read them; empty before the first sync that reads them.
 */
export async function getColumns(kind: string): Promise<CmsColumn[]> {
  const e = (await entries("columns", true)).find((x) => x.slug === kind);
  const cols = e ? (parse(e).columns as CmsColumn[] | undefined) : undefined;
  return Array.isArray(cols) ? cols : [];
}

export type CmsArticle = { slug: string; title: string; summary: string; area: string; industry: string; date: Date | null; mins: number; body: string; author: string; image: string; tags: { name: string; slug: string }[] };

/** Published articles. Optional Notion columns: SUMMARY, AREA, INDUSTRY, DATE, AUTHOR, IMAGE (a URL or site path), TAGS (multi-select). */
export async function getArticles(): Promise<CmsArticle[]> {
  const tagRows = await getDb().select().from(articleTag).catch(() => []);
  const byEntry = new Map<string, { name: string; slug: string }[]>();
  for (const t of tagRows) byEntry.set(t.entryId, [...(byEntry.get(t.entryId) ?? []), { name: t.tag, slug: t.slug }]);
  return (await entries("article", true)).map((e) => {
    const p = parse(e);
    // The tag table is filled by the sync; until it is, fall back to the TAGS column in the row's props.
    const tags = byEntry.get(e.id) ?? list(p, "Tags").map((name) => ({ name, slug: tagSlug(name) }));
    return { slug: e.slug, title: e.title, summary: text(p, "Summary", "Description") || lead(e.body), area: text(p, "Area", "Category", "Topic"), industry: text(p, "Industry"), date: dateOf(e, p), mins: readMins(e.body), body: e.body, author: text(p, "Author", "By"), image: text(p, "Image", "Cover"), tags };
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
