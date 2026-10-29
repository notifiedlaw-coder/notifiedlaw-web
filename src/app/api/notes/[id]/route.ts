import { and, eq } from "drizzle-orm";
import { getDb, userIdFrom } from "@/lib/auth";
import { topicNote } from "@/db/schema";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { cleanNote, noteView } from "@/lib/notes";
import { isNoteColor } from "@/lib/note-colors";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/notes/<id> { note?, color? }: rewrites one of the signed-in user's notes, or recolours its highlight. The passage it is on stays. */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const b = ((await readJson(req)) ?? {}) as { note?: unknown; color?: unknown };
  const set: { note?: string; color?: string; updatedAt?: Date } = {};
  if (b.note !== undefined) {
    const note = cleanNote(b.note);
    if (!note) return Response.json({ error: "Write a note first." }, { status: 400 });
    set.note = note;
    set.updatedAt = new Date();
  }
  if (b.color !== undefined) {
    if (!isNoteColor(b.color)) return Response.json({ error: "Unknown colour." }, { status: 400 });
    set.color = b.color;
  }
  if (!Object.keys(set).length) return Response.json({ error: "Nothing to change." }, { status: 400 });
  const [row] = await getDb().update(topicNote).set(set)
    .where(and(eq(topicNote.id, (await params).id), eq(topicNote.userId, userId))).returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ note: noteView(row) });
}

/** DELETE /api/notes/<id>: removes one of the signed-in user's notes. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const [row] = await getDb().delete(topicNote).where(and(eq(topicNote.id, (await params).id), eq(topicNote.userId, userId))).returning({ id: topicNote.id });
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
