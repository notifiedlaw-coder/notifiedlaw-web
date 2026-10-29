import { and, asc, eq } from "drizzle-orm";
import { topicNote } from "@/db/schema";
import { getDb, getPlan } from "@/lib/auth";
import { topicPlace } from "@/lib/cms";
import { topicLock } from "@/lib/data";
import { DEFAULT_COLOR, isNoteColor, type NoteColor } from "@/lib/note-colors";

export const MAX_NOTES_PER_TOPIC = 200;
export const MAX_QUOTE = 1000;
export const MAX_NOTE = 2000;
const MAX_BEFORE = 60;

export type TopicNote = { id: string; chapter: number; quote: string; before: string; note: string; color: NoteColor; createdAt: number; updatedAt: number };

/** One line of highlighted text: NFC, no control or invisible-format characters, single spaces. */
const line = (v: unknown, max: number) =>
  typeof v === "string" ? v.normalize("NFC").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

/** A note as typed: line breaks kept (at most one blank line in a row), other control characters dropped. */
export function cleanNote(v: unknown) {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[\p{Cf}\p{Zl}\p{Zp}]|[^\P{Cc}\n]/gu, " ")
    .split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_NOTE);
}

/** Validates a new note; returns it cleaned, or an error message. */
export function parseNewNote(b: unknown): { topicId: string; chapter: number; quote: string; before: string; note: string; color: NoteColor } | string {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const topicId = typeof o.topicId === "string" && /^[0-9a-f-]{32,36}$/i.test(o.topicId) ? o.topicId : "";
  if (!topicId) return "Unknown topic.";
  if (!Number.isInteger(o.chapter) || (o.chapter as number) < 0 || (o.chapter as number) > 500) return "Unknown chapter.";
  const quote = line(o.quote, MAX_QUOTE);
  if (!quote) return "Highlight some text to add a note to.";
  const note = cleanNote(o.note);
  if (!note) return "Write a note first.";
  // The text just before the highlight, kept from its end so it sits right next to the quote.
  const before = line(o.before, 500).slice(-MAX_BEFORE);
  return { topicId, chapter: o.chapter as number, quote, before, note, color: isNoteColor(o.color) ? o.color : DEFAULT_COLOR };
}

/** Why the signed-in reader may not keep notes on a topic (it is not live, or not on their plan), or null if they may. */
export async function noteBlock(topicId: string): Promise<string | null> {
  const place = await topicPlace(topicId);
  if (!place) return "This topic is not available.";
  return topicLock(await getPlan(), place.level, place.n) ? "This topic is not open on your plan." : null;
}

const view = (r: typeof topicNote.$inferSelect): TopicNote =>
  ({ id: r.id, chapter: r.chapter, quote: r.quote, before: r.before, note: r.note, color: isNoteColor(r.color) ? r.color : DEFAULT_COLOR, createdAt: r.createdAt.getTime(), updatedAt: r.updatedAt.getTime() });

/** A user's notes on one topic, in reading order: by chapter, then oldest first. */
export async function notesFor(userId: string, topicId: string): Promise<TopicNote[]> {
  const rows = await getDb().select().from(topicNote)
    .where(and(eq(topicNote.userId, userId), eq(topicNote.topicId, topicId)))
    .orderBy(asc(topicNote.chapter), asc(topicNote.createdAt));
  return rows.map(view);
}

export { view as noteView };
