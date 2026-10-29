import { lt } from "drizzle-orm";
import { cmsEntry } from "@/db/schema";
import { blocksToMarkdown, cleanTitle, type Block, type RichText } from "./markdown";
import { courseSlugFor, slugify } from "./map";
import { TIDY_VERSION, tidyMarkdown } from "./tidy";

// Reads the Notion "LAW DATABASE" through the Notion API and mirrors it into the cms_entry table.
//
//   LAW DATABASE            one row per section: LEVEL 100 ... , PRE BAR COURSES, LAW PRACTICE TRAINING,
//                           CASE BRIEFS, ARTICLES, PODCAST WRITEUPS, MOCK QUESTIONS
//   LEVEL n -> "... SEMESTER NOTES" database -> course pages -> "TOPIC OUTLINE" database -> topic pages
//   other sections hold a database of pages whose properties and body become the entry
//
// A row goes live as soon as it has body text; its Stage column is kept for reference but does not hold it back.
// Bodies are tidied on the way in (see tidy.ts), since most notes are pasted from PDFs.

const API = "https://api.notion.com/v1";
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type SyncSummary = { courses: number; topics: number; entries: number; published: number; fetchedBodies: number; removed: number };
type Db = ReturnType<typeof import("@/lib/auth").getDb>;
type Row = typeof cmsEntry.$inferInsert;

async function notion<T = Json>(token: string, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API + path, {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28", "content-type": "application/json" },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, (Number(res.headers.get("retry-after")) || 1) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`Notion ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as T;
  }
}

async function all<T>(fetchPage: (cursor?: string) => Promise<{ results: T[]; has_more: boolean; next_cursor: string | null }>): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const r = await fetchPage(cursor);
    out.push(...r.results);
    cursor = r.has_more && r.next_cursor ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

const queryDb = (token: string, id: string) =>
  all<Json>((cursor) => notion(token, `/databases/${id}/query`, { method: "POST", body: { page_size: 100, start_cursor: cursor, sorts: [{ timestamp: "created_time", direction: "ascending" }] } }));

async function children(token: string, id: string): Promise<Block[]> {
  const blocks = await all<Block>((cursor) => notion(token, `/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`));
  for (const b of blocks) {
    if (b.has_children && b.type !== "child_database" && b.type !== "child_page") b.children = await children(token, b.id);
  }
  return blocks;
}

const plain = (rt: RichText[] | undefined) => cleanTitle((rt ?? []).map((t) => t.plain_text).join(""));

function titleOf(page: Json): string {
  for (const p of Object.values<Json>(page.properties ?? {})) if (p.type === "title") return plain(p.title);
  return "";
}

/** All properties except the title, flattened to plain JSON values. */
function propsOf(page: Json): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, p] of Object.entries<Json>(page.properties ?? {})) {
    const key = name.trim();
    switch (p.type) {
      case "rich_text": out[key] = plain(p.rich_text); break;
      case "select": case "status": out[key] = p[p.type]?.name ?? null; break;
      case "multi_select": out[key] = (p.multi_select as Json[]).map((o) => o.name); break;
      case "number": case "checkbox": case "url": out[key] = p[p.type]; break;
      case "date": out[key] = p.date?.start ?? null; break;
      default: break; // title, people, relations, formulas and system fields are not needed
    }
  }
  return out;
}

function stageLabel(props: Record<string, unknown>): string | null {
  const raw = props["Stage"];
  return raw === undefined ? null : (Array.isArray(raw) ? raw.join(", ") : String(raw ?? "")) || null;
}

const LEVEL = (name: string): string | null => {
  const n = name.toLowerCase();
  const m = /level\s*(\d{3})/.exec(n);
  if (m) return m[1];
  if (/pre[\s-]*bar/.test(n)) return "pre-bar";
  if (/law practice|bar course/.test(n)) return "bar";
  return null;
};
const SECTION = (name: string): "case" | "article" | "episode" | "question" | null => {
  const n = name.toLowerCase();
  if (/case brief/.test(n)) return "case";
  if (/article/.test(n)) return "article";
  if (/podcast/.test(n)) return "episode";
  if (/mock|question/.test(n)) return "question";
  return null;
};

export async function syncNotion(opts: { token: string; rootDatabaseId: string; db: Db }): Promise<SyncSummary> {
  const { token, rootDatabaseId, db } = opts;
  const started = new Date();
  // What is already stored, so a page that has not changed in Notion is not fetched again.
  const known = new Map((await db.select({ id: cmsEntry.id, edited: cmsEntry.notionEditedAt, body: cmsEntry.body, props: cmsEntry.props }).from(cmsEntry)).map((r) => [r.id, r]));
  const rows: Row[] = [];
  let fetchedBodies = 0;

  async function addEntry(page: Json, base: Pick<Row, "kind" | "parentId" | "level" | "semester" | "slug" | "position">) {
    const props = propsOf(page);
    const prev = known.get(page.id);
    let body: string;
    // A stored body is reused only if the page is unchanged and was tidied by these same rules; otherwise the page
    // is read again, since tidied text cannot be un-tidied (a wrong heading would stay one).
    const sameRules = (() => { try { return (JSON.parse(prev?.props ?? "{}") as { _tidy?: number })._tidy === TIDY_VERSION; } catch { return false; } })();
    if (prev && sameRules && prev.edited === page.last_edited_time) body = prev.body;
    else { fetchedBodies++; body = tidyMarkdown(blocksToMarkdown(await children(token, page.id))); }
    const published = body.trim().length > 0;
    rows.push({
      // _tidy: the rules the body was tidied with. No Notion column starts with "_", so it never clashes.
      id: page.id, title: titleOf(page) || "Untitled", props: JSON.stringify({ ...props, _tidy: TIDY_VERSION }), stage: stageLabel(props),
      notionEditedAt: page.last_edited_time, syncedAt: started, body, published, ...base,
    });
  }

  const sections = await queryDb(token, rootDatabaseId);
  for (const section of sections) {
    const name = titleOf(section);
    const level = LEVEL(name);
    const kind = SECTION(name);
    if (!level && !kind) continue;
    const dbs = (await children(token, section.id)).filter((b) => b.type === "child_database");

    if (level) {
      for (const sem of dbs) {
        const semName = String((sem.child_database as Json)?.title ?? "");
        const semester = /second|2nd|\b2\b/i.test(semName) ? "2" : "1";
        for (const [ci, course] of (await queryDb(token, sem.id)).entries()) {
          const title = titleOf(course);
          if (!title) continue;
          const slug = courseSlugFor(title);
          rows.push({
            id: course.id, kind: "course", parentId: null, level, semester, title, slug, position: ci,
            props: JSON.stringify({ ...propsOf(course), semesterName: semName }), body: "", stage: null,
            published: true, notionEditedAt: course.last_edited_time, syncedAt: started,
          });
          for (const outline of (await children(token, course.id)).filter((b) => b.type === "child_database")) {
            let pos = 0;
            for (const t of await queryDb(token, outline.id)) {
              if (!titleOf(t)) continue;
              await addEntry(t, { kind: "topic", parentId: course.id, level, semester, slug: `${slug}-${pos + 1}`, position: pos++ });
            }
          }
        }
      }
    } else if (kind) {
      for (const d of dbs) {
        let pos = 0;
        for (const it of await queryDb(token, d.id)) {
          const t = titleOf(it);
          if (!t) continue;
          await addEntry(it, { kind, parentId: null, level: null, semester: null, slug: slugify(t), position: pos++ });
        }
      }
    }
  }

  const stmts = rows.map((values) => {
    const { id, ...set } = values; // eslint-disable-line @typescript-eslint/no-unused-vars
    return db.insert(cmsEntry).values(values).onConflictDoUpdate({ target: cmsEntry.id, set });
  });
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50) as [(typeof stmts)[0], ...typeof stmts]);

  // Only after every Notion read and write succeeded: drop pages that were deleted in Notion.
  const removed = (await db.delete(cmsEntry).where(lt(cmsEntry.syncedAt, started)).returning({ id: cmsEntry.id })).length;
  const count = (k: string) => rows.filter((r) => r.kind === k).length;
  return { courses: count("course"), topics: count("topic"), entries: rows.length, published: rows.filter((r) => r.published && r.kind !== "course").length, fetchedBodies, removed };
}
