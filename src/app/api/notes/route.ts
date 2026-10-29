import { and, count, eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { topicNote } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { MAX_NOTES_PER_TOPIC, noteBlock, noteView, notesFor, parseNewNote } from "@/lib/notes";

/** GET /api/notes?topic=<Notion page id>: the signed-in user's notes on a topic. */
export async function GET(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const topicId = new URL(req.url).searchParams.get("topic") ?? "";
  if (!/^[0-9a-f-]{32,36}$/i.test(topicId)) return Response.json({ error: "Unknown topic." }, { status: 400 });
  return Response.json({ notes: await notesFor(userId, topicId) });
}

/** POST /api/notes { topicId, chapter, quote, before, note }: pins a note to a highlighted passage of a topic. */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "Sign in to keep notes." }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const n = parseNewNote(await readJson(req));
  if (typeof n === "string") return Response.json({ error: n }, { status: 400 });
  const blocked = await noteBlock(n.topicId);
  if (blocked) return Response.json({ error: blocked }, { status: 403 });
  const db = getDb();
  const [{ c }] = await db.select({ c: count() }).from(topicNote).where(and(eq(topicNote.userId, userId), eq(topicNote.topicId, n.topicId)));
  if (c >= MAX_NOTES_PER_TOPIC) return Response.json({ error: `You can keep up to ${MAX_NOTES_PER_TOPIC} notes on a topic.` }, { status: 409 });
  const now = new Date();
  const [row] = await db.insert(topicNote).values({ id: crypto.randomUUID(), userId, ...n, createdAt: now, updatedAt: now }).returning();
  return Response.json({ note: noteView(row) }, { status: 201 });
}
