import { userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readJson } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { checkFile, cleanFileName } from "@/lib/file-check";
import { countUpload, quotaFor, saveFile } from "@/lib/files";
import { messagesOf, ownChat } from "@/lib/ai/chats";
import { answerDocx } from "@/lib/ai/answer-doc";

/**
 * POST /api/ai/save { chatId, messageId }: saves one Notified AI answer, with its question and sources, as a Word
 * document in the user's My Files. The text is read from the stored conversation on the server, never from the
 * browser. Made here, so it skips the virus scan an upload gets; it still passes the content check.
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  const quota = await quotaFor(userId);
  if (!quota) return apiError("U101", 402);
  const body = (await readJson(req)) as { chatId?: unknown; messageId?: unknown } | null;
  const chat = typeof body?.chatId === "string" ? await ownChat(userId, body.chatId) : undefined;
  if (!chat || typeof body?.messageId !== "string") return apiError("AI106", 404);
  const all = await messagesOf(chat.id);
  const at = all.findIndex((m) => m.id === body.messageId && m.role === "assistant");
  if (at < 0) return apiError("AI106", 404);

  const bytes = answerDocx({ title: chat.title, question: all[at - 1]?.role === "user" ? all[at - 1].content : "", answer: all[at].content, sources: all[at].files });
  const check = await checkFile(bytes);
  if (!check.ok || check.kind !== "docx") {
    console.error("generated answer failed the content check", check.ok ? "wrong kind" : check.error);
    return apiError("C106", 500);
  }
  const name = cleanFileName(`Notified AI - ${chat.title}.docx`, "docx");
  if (!name) return apiError("U110", 422);
  if (!(await countUpload(userId, bytes.length))) return apiError("U107", 429);
  const saved = await saveFile(userId, quota, { name, kind: "docx", folderId: null, bytes });
  if (!saved.ok) return apiError(saved.code, saved.status);
  return Response.json(saved.file, { status: 201, headers: { "cache-control": "private, no-store" } });
}
