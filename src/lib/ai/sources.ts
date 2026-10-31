import { inArray } from "drizzle-orm";
import { userFile } from "@/db/schema";
import { getDb, planFor } from "@/lib/auth";
import { getCaseBriefs, topicById } from "@/lib/cms";
import { topicLock } from "@/lib/data";
import { textOf, MAX_DOC_CHARS } from "@/lib/ai/file-text";
import { MAX_REFS, type Ref, type RefKind } from "@/lib/ai/refs";
import type { Attached } from "@/lib/ai/prompt";

/** Most of all attached text together, in characters. */
export const MAX_ATTACHED_CHARS = 90_000;

/** Why the @-mentions could not be used: `missing` (not the user's, not live, or not on their plan) or `unreadable` (could not be read). */
export class SourceError extends Error {
  constructor(public why: "missing" | "unreadable", detail?: string) { super(detail ?? why); }
}

/**
 * The documents behind @-mentions, numbered from 1 in the order given, with the refs (names and links) to store.
 * Files must be the user's own; case briefs must be published; topics must be live and open on the user's plan.
 * Throws SourceError.
 */
export async function resolveRefs(userId: string, wanted: { kind: RefKind; id: string }[]): Promise<{ docs: Attached[]; refs: Ref[]; chars: number }> {
  if (wanted.length > MAX_REFS) throw new SourceError("missing");
  const files = new Map<string, typeof userFile.$inferSelect>();
  const ids = wanted.filter((w) => w.kind === "file").map((w) => w.id);
  if (ids.length) for (const f of await getDb().select().from(userFile).where(inArray(userFile.id, ids))) if (f.userId === userId) files.set(f.id, f);
  const cases = wanted.some((w) => w.kind === "case") ? await getCaseBriefs() : [];
  const plan = wanted.some((w) => w.kind === "topic") ? await planFor(userId) : "None";

  const docs: Attached[] = [];
  const refs: Ref[] = [];
  let budget = MAX_ATTACHED_CHARS;
  for (const w of wanted) {
    let name: string, href: string, text: string;
    if (w.kind === "file") {
      const f = files.get(w.id);
      if (!f) throw new SourceError("missing");
      try { text = (await textOf(f)).text; } catch (e) { throw new SourceError("unreadable", e instanceof Error ? e.message : String(e)); }
      name = f.name; href = "/files";
    } else if (w.kind === "case") {
      const c = cases.find((x) => x.id === w.id);
      if (!c) throw new SourceError("missing");
      name = c.title; href = `/case-law/${c.slug}`;
      text = `${c.cite ? `Citation: ${c.cite}\n` : ""}${c.court ? `Court: ${c.court}\n` : ""}${c.jurisdiction.length ? `Jurisdiction: ${c.jurisdiction.join(", ")}\n` : ""}\n${c.body}`;
    } else {
      const t = await topicById(w.id);
      if (!t || topicLock(plan, t.level, t.n)) throw new SourceError("missing");
      name = `${t.title} (${t.course})`; href = `/library/${t.courseSlug}/${t.n}`; text = t.body;
    }
    const cut = text.slice(0, Math.min(MAX_DOC_CHARS, Math.max(0, budget)));
    budget -= cut.length;
    docs.push({ n: docs.length + 1, name, text: cut, truncated: cut.length < text.length });
    refs.push({ kind: w.kind, id: w.id, name, href });
  }
  return { docs, refs, chars: docs.reduce((n, d) => n + d.text.length, 0) };
}
