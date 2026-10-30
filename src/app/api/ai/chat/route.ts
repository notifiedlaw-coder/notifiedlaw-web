import { getDb, userIdFrom } from "@/lib/auth";
import { aiChat } from "@/db/schema";
import { eq } from "drizzle-orm";
import { limited } from "@/lib/rate-limit";
import { readBytes } from "@/lib/http";
import { apiError } from "@/lib/error-codes";
import { quotaFor } from "@/lib/files";
import { AiUnavailable, kimiConfigured, kimiStream, kimiText } from "@/lib/ai/kimi";
import { addMessage, createChat, creditsLeft, deleteFrom, messagesOf, ownChat, refundCredits, spendCredits } from "@/lib/ai/chats";
import { buildMessages } from "@/lib/ai/prompt";
import { MAX_REFS, type RefKind } from "@/lib/ai/refs";
import { MAX_QUESTION, messageCost } from "@/lib/ai/cost";
import { isMode } from "@/lib/ai/modes";
import { SourceError, resolveRefs } from "@/lib/ai/sources";

const sse = (o: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(o)}\n\n`);
const ID = /^[0-9a-f-]{32,36}$/i;
const KINDS: RefKind[] = ["file", "case", "topic"];

/**
 * POST /api/ai/chat: asks Notified AI a question and streams the answer as server-sent events:
 * { type: "meta", chatId, userMessageId, sources } first, then { type: "delta", text } for each piece, then
 * { type: "done", credits, cost, messageId } (and { type: "title", title } after a new chat's first answer) or
 * { type: "error", code }.
 *   { chatId?, message, refs?: [{ kind, id }], mode? }      a new question
 *   { chatId, message, refs?, mode?, edit: messageId }       replaces that question and everything after it
 *   { chatId, regenerate: messageId, mode? }                 answers the question before that answer again
 * `refs` are what the user @-mentioned: their own files, case briefs, and library topics open on their plan.
 * The cost (src/lib/ai/cost.ts) is taken before the model is called and given back if no answer comes.
 * Failures before the stream starts answer with a code only (src/lib/error-codes.ts).
 */
export async function POST(req: Request) {
  const userId = await userIdFrom(req);
  if (!userId) return apiError("A001", 401);
  const rl = await limited(req, "WRITES", userId);
  if (rl) return rl;
  if (!(await quotaFor(userId))) return apiError("U101", 402);

  const raw = await readBytes(req, 32 * 1024);
  let body: Record<string, unknown> | null = null;
  try { body = raw ? JSON.parse(new TextDecoder().decode(raw)) : null; } catch { /* falls through */ }
  const mode = isMode(body?.mode) ? body.mode : "ask";
  const regenerate = typeof body?.regenerate === "string" ? body.regenerate : null;
  const edit = typeof body?.edit === "string" ? body.edit : null;
  let message = typeof body?.message === "string" ? body.message.trim() : "";
  let wanted = (Array.isArray(body?.refs) ? body.refs : []).flatMap((r): { kind: RefKind; id: string }[] => {
    const o = r as { kind?: unknown; id?: unknown };
    return KINDS.includes(o?.kind as RefKind) && typeof o.id === "string" && ID.test(o.id) ? [{ kind: o.kind as RefKind, id: o.id }] : [];
  });
  wanted = wanted.filter((w, i) => wanted.findIndex((x) => x.kind === w.kind && x.id === w.id) === i);
  if (wanted.length > MAX_REFS || message.length > MAX_QUESTION || (!regenerate && !message) || ((regenerate || edit) && typeof body?.chatId !== "string")) return apiError("AI101", 400);
  if (!kimiConfigured()) return apiError("AI104", 503);

  let chat = null;
  if (body?.chatId !== undefined && body.chatId !== null) {
    chat = typeof body.chatId === "string" ? await ownChat(userId, body.chatId) : undefined;
    if (!chat) return apiError("AI106", 404);
  }

  // What is asked, with which sources, after which earlier messages.
  let history = chat ? await messagesOf(chat.id) : [];
  let replace: string | null = null; // from this message on is deleted once the credit is taken
  let keepQuestion = false; // regenerate: the question is already stored
  let userMessageId: string | null = null;
  if (regenerate) {
    const at = history.findIndex((m) => m.id === regenerate && m.role === "assistant");
    const q = history[at - 1];
    if (at < 1 || q?.role !== "user") return apiError("AI106", 404);
    message = q.content;
    wanted = q.files.map((f) => ({ kind: f.kind, id: f.id }));
    userMessageId = q.id;
    keepQuestion = true;
    replace = regenerate;
    history = history.slice(0, at - 1);
  } else if (edit) {
    const at = history.findIndex((m) => m.id === edit && m.role === "user");
    if (at < 0) return apiError("AI106", 404);
    replace = edit;
    history = history.slice(0, at);
  }

  let sources;
  try {
    sources = await resolveRefs(userId, wanted);
  } catch (e) {
    if (e instanceof SourceError && e.why === "missing") return apiError("AI102", 404);
    console.error("could not read a mentioned source", e instanceof SourceError || e instanceof AiUnavailable ? e.message : e);
    return apiError("AI105", 502);
  }
  const cost = messageCost(sources.chars, mode);
  if (!(await spendCredits(userId, cost))) return apiError("AI103", 402);

  const firstQuestion = !chat;
  let chatId: string;
  try {
    chatId = chat?.id ?? (await createChat(userId, message));
    if (replace) await deleteFrom(chatId, replace);
    if (!keepQuestion) userMessageId = await addMessage(chatId, "user", message, sources.refs);
  } catch (e) {
    console.error("could not save the question", e);
    await refundCredits(userId, cost);
    return apiError("AI104", 500);
  }

  const messages = buildMessages(history, message, sources.docs, mode);
  const abort = new AbortController();
  let answer = "";
  let saved: string | null = null;
  let finished = false;
  // Saves what was written; an answer with nothing in it is refunded instead.
  const finish = async () => {
    if (finished) return;
    finished = true;
    if (answer.trim()) saved = await addMessage(chatId, "assistant", answer, sources.refs);
    else await refundCredits(userId, cost);
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(sse({ type: "meta", chatId, userMessageId, sources: sources.refs }));
      try {
        for await (const text of kimiStream(messages, { signal: abort.signal })) {
          answer += text;
          controller.enqueue(sse({ type: "delta", text }));
        }
        await finish();
        controller.enqueue(sse({ type: "done", credits: (await creditsLeft(userId)).left, cost, messageId: saved }));
        // A new chat gets a title written from its first exchange, at no credit cost.
        if (firstQuestion && saved) {
          try {
            const title = (await kimiText("Write a title of at most six words for this study conversation. Reply with the title only: no quotes, no full stop.", `Question: ${message.slice(0, 500)}\n\nAnswer: ${answer.slice(0, 700)}`))
              .replace(/["“”.\n]/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
            if (title) {
              await getDb().update(aiChat).set({ title }).where(eq(aiChat.id, chatId));
              controller.enqueue(sse({ type: "title", title }));
            }
          } catch (e) { console.error("chat title failed", e instanceof AiUnavailable ? e.message : e); }
        }
      } catch (e) {
        console.error("Notified AI stream failed", e instanceof AiUnavailable ? e.message : e);
        const partial = !!answer.trim();
        await finish();
        controller.enqueue(sse({ type: "error", code: partial ? "AI107" : "AI104", credits: (await creditsLeft(userId)).left }));
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
