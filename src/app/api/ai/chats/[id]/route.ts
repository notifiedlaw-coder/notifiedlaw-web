import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { deleteChat, messagesOf, ownChat, updateChat } from "@/lib/ai/chats";

const noStore = { "cache-control": "private, no-store" };
type Ctx = { params: Promise<{ id: string }> };

/** GET /api/ai/chats/:id: one conversation's messages. */
export async function GET(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "READS", userId);
  if (rl) return rl;
  const chat = await ownChat(userId, (await params).id);
  if (!chat) return apiError("AI106", 404);
  return Response.json({ id: chat.id, title: chat.title, messages: await messagesOf(chat.id) }, { headers: noStore });
}

/** PATCH /api/ai/chats/:id { title?, pinned? }: renames and/or pins a conversation. */
export async function PATCH(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const body = (await readJson(req)) as { title?: unknown; pinned?: unknown } | null;
  const set: { title?: string; pinned?: boolean } = {};
  if (body?.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!title) return apiError("AI101", 400);
    set.title = title;
  }
  if (body?.pinned !== undefined) {
    if (typeof body.pinned !== "boolean") return apiError("AI101", 400);
    set.pinned = body.pinned;
  }
  if (!Object.keys(set).length) return apiError("AI101", 400);
  const { id } = await params;
  if (!(await ownChat(userId, id))) return apiError("AI106", 404);
  await updateChat(userId, id, set);
  return Response.json({ id, ...set }, { headers: noStore });
}

/** DELETE /api/ai/chats/:id: deletes a conversation and its messages. */
export async function DELETE(req: Request, { params }: Ctx) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const { id } = await params;
  if (!(await ownChat(userId, id))) return apiError("AI106", 404);
  await deleteChat(userId, id);
  return new Response(null, { status: 204, headers: noStore });
}
