import { inArray } from "drizzle-orm";
import { userFile } from "@/db/schema";
import { getDb, userIdFrom } from "@/lib/auth";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { quotaFor } from "@/lib/files";
import { AiUnavailable, kimiConfigured, kimiStream } from "@/lib/ai/kimi";
import { addMessage, createChat, creditsLeft, messagesOf, ownChat, refundCredits, spendCredits, type ChatFile } from "@/lib/ai/chats";
import { textOf } from "@/lib/ai/file-text";
import { MAX_ATTACHED_CHARS, MAX_QUESTION, buildMessages, type Attached } from "@/lib/ai/prompt";

const MAX_FILES = 5;
const sse = (o: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(o)}\n\n`);

/**
 * POST /api/ai/chat { chatId?, message, fileIds? }: asks Notified AI a question and streams the answer as server-sent
 * events: { type: "meta", chatId } first, then { type: "delta", text } for each piece, then { type: "done", credits }
 * or { type: "error", code }. `fileIds` are My Files documents the user @-mentioned; they must be the user's own.
 * Costs AI_MESSAGE_COST Notify Credits, taken before the model is called and given back if no answer comes.
 * Failures before the stream starts answer with a code only (src/lib/error-codes.ts).
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await quotaFor(userId))) return apiError("U101", 402);

  const raw = await readBytes(req, 32 * 1024);
  let body: { chatId?: unknown; message?: unknown; fileIds?: unknown } | null = null;
  try { body = raw ? JSON.parse(new TextDecoder().decode(raw)) : null; } catch { /* falls through */ }
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const fileIds = Array.isArray(body?.fileIds) ? [...new Set(body.fileIds.filter((x): x is string => typeof x === "string"))] : [];
  if (!message || message.length > MAX_QUESTION || fileIds.length > MAX_FILES || fileIds.some((f) => !/^[0-9a-f-]{32,36}$/i.test(f))) return apiError("AI101", 400);
  if (!kimiConfigured()) return apiError("AI104", 503);

  let chat = null;
  if (body?.chatId !== undefined && body.chatId !== null) {
    chat = typeof body.chatId === "string" ? await ownChat(userId, body.chatId) : undefined;
    if (!chat) return apiError("AI106", 404);
  }

  // Mentioned files: only the user's own.
  const rows = fileIds.length ? (await getDb().select().from(userFile).where(inArray(userFile.id, fileIds))).filter((f) => f.userId === userId) : [];
  if (rows.length !== fileIds.length) return apiError("AI102", 404);
  const docs: Attached[] = [];
  let budget = MAX_ATTACHED_CHARS;
  try {
    for (const f of rows) {
      const t = await textOf(f);
      const text = t.text.slice(0, Math.max(0, budget));
      budget -= text.length;
      docs.push({ name: f.name, text, truncated: t.truncated || text.length < t.text.length });
    }
  } catch (e) {
    console.error("could not read a mentioned file", e instanceof AiUnavailable ? e.message : e);
    return apiError("AI105", 502);
  }

  if (!(await spendCredits(userId))) return apiError("AI103", 402);
  const attached: ChatFile[] = rows.map((f) => ({ id: f.id, name: f.name }));
  let chatId: string;
  let history;
  try {
    chatId = chat?.id ?? (await createChat(userId, message));
    history = chat ? await messagesOf(chatId) : [];
    await addMessage(chatId, "user", message, attached);
  } catch (e) {
    console.error("could not save the question", e);
    await refundCredits(userId);
    return apiError("AI104", 500);
  }

  const messages = buildMessages(history, message, docs);
  const abort = new AbortController();
  let answer = "";
  let finished = false;
  // Saves what was written; an answer with nothing in it is refunded instead.
  const finish = async () => {
    if (finished) return;
    finished = true;
    if (answer.trim()) await addMessage(chatId, "assistant", answer);
    else await refundCredits(userId);
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sse({ type: "meta", chatId }));
      try {
        for await (const text of kimiStream(messages, { signal: abort.signal })) {
          answer += text;
          controller.enqueue(sse({ type: "delta", text }));
        }
        await finish();
        controller.enqueue(sse({ type: "done", credits: (await creditsLeft(userId)).left }));
      } catch (e) {
        console.error("Notified AI stream failed", e instanceof AiUnavailable ? e.message : e);
        const partial = !!answer.trim();
        await finish();
        controller.enqueue(sse({ type: "error", code: partial ? "AI107" : "AI104" }));
      }
      controller.close();
    },
    // The reader pressed Stop or left: keep what was written.
    async cancel() {
      abort.abort();
      await finish();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "private, no-store, no-transform", "x-accel-buffering": "no" } });
}
