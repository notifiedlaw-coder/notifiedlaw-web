"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Markdown } from "@/components/markdown";
import type { ChatSummary, StoredMessage } from "@/lib/ai/chats";
import { MAX_QUESTION, messageCost } from "@/lib/ai/cost";
import { MODES, MODE_ORDER, type Mode } from "@/lib/ai/modes";
import { MAX_REFS, type Mentionable, type Ref, type RefKind } from "@/lib/ai/refs";

const SUGGESTIONS: [string, string][] = [
  ["Explain", "Explain judicial review under the 1992 Constitution"],
  ["Ask", "What makes a contract valid in Ghana?"],
  ["IRAC", "Walk me through an IRAC answer on negligence"],
];
/** Hick's law: the first three modes cover most sessions; the rest open on request. */
const FIRST_MODES = 3;
/** One-tap questions about what is attached; also what /ai?ask= writes. */
const QUICK = {
  summarise: ["Summarise", "Summarise this in plain English: the key points, then what matters most for a student."],
  issues: ["Key issues", "List the key legal issues here and the rule that applies to each."],
  revision: ["Revision notes", "Turn this into concise revision notes with headings and bullet points."],
} as const;

/** All the user is told about a failure: never the reason, only a code support can look up (src/lib/error-codes.ts). */
const errorText = (code: string) => `An error has occurred please try again later. Error code: ${code}`;
const codeOf = async (res: Response | null) => (res ? (((await res.json().catch(() => null)) as { code?: string } | null)?.code ?? `H${res.status}`) : "N001");

type Msg = Pick<StoredMessage, "id" | "role" | "content" | "files">;
const isTemp = (id: string) => id.startsWith("tmp-");
const tmp = (p: string) => `tmp-${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/** The "@name" being typed just before the caret: its query and where it starts, else null. */
function mentionAt(text: string, caret: number) {
  const m = /(^|\s)@([^\s@]{0,40})$/.exec(text.slice(0, caret));
  return m ? { query: m[2], start: caret - m[2].length - 1 } : null;
}

// Speech recognition is the browser's (Chrome, Edge, Safari); where it is missing the microphone is not shown.
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
const recognitionCtor = () => (typeof window === "undefined" ? undefined : (window as unknown as Record<string, (new () => Recognition) | undefined>).SpeechRecognition ?? (window as unknown as Record<string, (new () => Recognition) | undefined>).webkitSpeechRecognition);
const canListen = () => !!recognitionCtor();
const noSubscribe = () => () => {};

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** "[1]" in an answer as a superscript link to the first source, "[2]" to the second, and so on; unknown numbers stay as written. */
const withCitations = (content: string, sources: Ref[]) =>
  sources.length ? content.replace(/\[(\d{1,2})\](?!\()/g, (all, d: string) => (sources[Number(d) - 1] ? `[${[...d].map((c) => SUP[Number(c)]).join("")}](${sources[Number(d) - 1].href})` : all)) : content;

/** Notified AI: a chat with the user's files, case briefs and library topics one @ away. Conversations on the left from wide screens, in a sheet below. */
export function NotifiedAi({ chats: initial, credits: first, mentions, ready, initial: start }: {
  chats: ChatSummary[]; credits: { allowance: number; left: number }; mentions: Mentionable[]; ready: boolean;
  initial: { ref: Mentionable; ask: keyof typeof QUICK | null } | null;
}) {
  const [chats, setChats] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(first.left);
  const [text, setText] = useState(start?.ask ? QUICK[start.ask][1] : "");
  const [attached, setAttached] = useState<Mentionable[]>(start ? [start.ref] : []);
  const [mode, setMode] = useState<Mode>("ask");
  const [moreModes, setMoreModes] = useState(false);
  const [caret, setCaret] = useState(0);
  const [pickerOff, setPickerOff] = useState(false); // Escape closes the list until the next keystroke
  const [pickIndex, setPickIndex] = useState(0);
  const [history, setHistory] = useState(false);
  const [listening, setListening] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const voice = useRef<Recognition | null>(null);
  const hearing = useSyncExternalStore(noSubscribe, canListen, () => false);

  const mention = pickerOff ? null : mentionAt(text, caret);
  const options = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const free = mentions.filter((m) => !attached.some((a) => a.kind === m.kind && a.id === m.id) && (m.name.toLowerCase().includes(q) || m.sub.toLowerCase().includes(q)));
    return (["file", "case", "topic"] as RefKind[]).flatMap((k) => free.filter((m) => m.kind === k).slice(0, 4));
  }, [mention, mentions, attached]);

  const attachedChars = Math.min(90_000, attached.reduce((n, a) => n + Math.min(40_000, a.chars), 0));
  const cost = messageCost(attachedChars, mode);
  const noCredits = first.allowance === 0 || left <= 0;
  const short = !noCredits && cost > left;
  const active = chats.find((c) => c.id === activeId);

  // Keep the newest text in view while it streams, unless the reader scrolled up.
  useEffect(() => {
    if (stick.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);
  useEffect(() => () => { abort.current?.abort(); voice.current?.stop(); }, []);
  useEffect(() => {
    // Opened from a file, case or topic with a question ready: put the caret at the end.
    if (start?.ask) { input.current?.focus(); grow(); }
  }, [start]);

  function grow() {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }
  const setDraft = (t: string) => { setText(t); requestAnimationFrame(() => { input.current?.focus(); grow(); }); };

  async function openChat(id: string) {
    setHistory(false);
    if (id === activeId || streaming) return;
    setActiveId(id);
    setMessages([]);
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/ai/chats/${id}`).catch(() => null);
    const j = res?.ok ? ((await res.json().catch(() => null)) as { messages: Msg[] } | null) : null;
    setLoading(false);
    stick.current = true;
    if (j) setMessages(j.messages);
    else setError(errorText(await codeOf(res)));
  }

  function newChat() {
    if (streaming) return;
    setHistory(false);
    setActiveId(null);
    setMessages([]);
    setError(null);
    input.current?.focus();
  }

  async function removeChat(id: string) {
    setChats((c) => c.filter((x) => x.id !== id));
    if (id === activeId) { setActiveId(null); setMessages([]); }
    await fetch(`/api/ai/chats/${id}`, { method: "DELETE" }).catch(() => {});
  }
  async function patchChat(id: string, set: { title?: string; pinned?: boolean }) {
    setChats((c) => c.map((x) => (x.id === id ? { ...x, ...set } : x)));
    await fetch(`/api/ai/chats/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(set) }).catch(() => {});
  }

  function pick(m: Mentionable) {
    if (!mention || attached.length >= MAX_REFS) return;
    setText(text.slice(0, mention.start) + text.slice(caret));
    setAttached((a) => [...a, m]);
    setPickIndex(0);
    requestAnimationFrame(() => {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(mention.start, mention.start);
      setCaret(mention.start);
      grow();
    });
  }

  function toggleVoice() {
    if (listening) { voice.current?.stop(); return; }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.continuous = true;
    const base = text && !/\s$/.test(text) ? `${text} ` : text;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += piece; else interim += piece;
      }
      setText((base + finalText + interim).slice(0, MAX_QUESTION));
      requestAnimationFrame(grow);
    };
    rec.onend = () => { setListening(false); voice.current = null; };
    rec.onerror = () => { setListening(false); voice.current = null; };
    voice.current = rec;
    setListening(true);
    rec.start();
  }

  /**
   * Sends a question (or replaces one: `edit`, or answers again: `regenerate`) and reads the streamed answer. The
   * messages shown change at once and are put back, with the reason as a code, if the request is refused.
   */
  async function send(o: { question?: string; refs?: Mentionable[] | Ref[]; mode?: Mode; edit?: string; regenerate?: string } = {}) {
    if (streaming) return;
    voice.current?.stop();
    const m = o.mode ?? mode;
    const refs = o.refs ?? attached;
    const fromBox = o.question === undefined && !o.edit && !o.regenerate;
    const question = (o.question ?? text).trim();
    if (!o.regenerate && (!question || noCredits)) return;
    const before = messages;
    const cutAt = o.edit ? before.findIndex((x) => x.id === o.edit) : o.regenerate ? before.findIndex((x) => x.id === o.regenerate) : before.length;
    const kept = cutAt < 0 ? before : before.slice(0, cutAt);
    const replyId = tmp("a");
    const userMsg: Msg = { id: tmp("u"), role: "user", content: question, files: refs.map(({ kind, id, name, href }) => ({ kind, id, name, href })) };
    stick.current = true;
    setError(null);
    setStreaming(true);
    setMessages(o.regenerate ? [...kept, { id: replyId, role: "assistant", content: "", files: [] }] : [...kept, userMsg, { id: replyId, role: "assistant", content: "", files: [] }]);
    if (fromBox) { setText(""); setAttached([]); requestAnimationFrame(grow); }

    const ctl = new AbortController();
    abort.current = ctl;
    const res = await fetch("/api/ai/chat", {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({
        chatId: activeId, message: o.regenerate ? undefined : question, mode: m, edit: o.edit, regenerate: o.regenerate,
        refs: o.regenerate ? undefined : refs.map((r) => ({ kind: r.kind, id: r.id })),
      }),
    }).catch(() => null);
    if (!res || !res.ok || !res.body) {
      setStreaming(false);
      if (ctl.signal.aborted) return;
      setMessages(before);
      if (fromBox) { setText(question); setAttached(refs as Mentionable[]); }
      return setError(errorText(await codeOf(res)));
    }

    let chatId = activeId;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    type Event = { type: string; chatId?: string; userMessageId?: string; sources?: Ref[]; text?: string; credits?: number; messageId?: string; title?: string; code?: string };
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let end: number;
        while ((end = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, end).trim();
          buf = buf.slice(end + 2);
          if (!line.startsWith("data:")) continue;
          const ev = JSON.parse(line.slice(5)) as Event;
          if (ev.type === "meta" && ev.chatId) {
            chatId = ev.chatId;
            const id = ev.chatId;
            setActiveId(id);
            setChats((c) => (c.some((x) => x.id === id) ? c : [{ id, title: question.replace(/\s+/g, " ").slice(0, 60), pinned: false, updatedAt: Date.now() }, ...c]));
            setMessages((ms) => ms.map((x) => (x.id === userMsg.id && ev.userMessageId ? { ...x, id: ev.userMessageId } : x.id === replyId ? { ...x, files: ev.sources ?? [] } : x)));
          } else if (ev.type === "delta" && ev.text) {
            const t = ev.text;
            setMessages((ms) => ms.map((x) => (x.id === replyId ? { ...x, content: x.content + t } : x)));
          } else if (ev.type === "done") {
            if (typeof ev.credits === "number") setLeft(ev.credits);
            const real = ev.messageId;
            if (real) setMessages((ms) => ms.map((x) => (x.id === replyId ? { ...x, id: real } : x)));
          } else if (ev.type === "title" && ev.title && chatId) {
            const id = chatId, title = ev.title;
            setChats((c) => c.map((x) => (x.id === id ? { ...x, title } : x)));
          } else if (ev.type === "error") {
            setError(errorText(ev.code ?? "AI104"));
            if (typeof ev.credits === "number") setLeft(ev.credits);
          }
        }
      }
    } catch {
      if (!ctl.signal.aborted) setError(errorText("N001"));
    }
    // An answer with nothing in it is not kept (the server gave the credits back).
    setMessages((ms) => ms.filter((x) => !(x.id === replyId && !x.content)));
    if (chatId) setChats((c) => c.map((x) => (x.id === chatId ? { ...x, updatedAt: Date.now() } : x)));
    setStreaming(false);
    abort.current = null;
    if (ctl.signal.aborted) void fetch("/api/ai/chats").then((r) => r.json() as Promise<{ credits?: { left: number } }>).then((j) => { if (j.credits) setLeft(j.credits.left); }).catch(() => {});
  }

  async function saveAnswer(messageId: string) {
    const res = await fetch("/api/ai/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chatId: activeId, messageId }) }).catch(() => null);
    return res?.ok ? null : errorText(await codeOf(res));
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && options.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setPickIndex((i) => (i + 1) % options.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setPickIndex((i) => (i - 1 + options.length) % options.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(options[Math.min(pickIndex, options.length - 1)]); return; }
    }
    if (mention && e.key === "Escape") { e.preventDefault(); setPickerOff(true); return; }
    if (e.key === "Enter" && !e.shiftKey && !window.matchMedia("(pointer: coarse)").matches && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
  }

  const list = <ChatList chats={chats} activeId={activeId} onOpen={openChat} onDelete={removeChat} onPatch={patchChat} />;
  const empty = !messages.length && !loading;
  const lastAnswer = messages.length ? messages[messages.length - 1] : null;

  return (
    <div className="flex h-full min-h-0 bg-canvas">
      {/* Wide screens: the conversations beside the chat. */}
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-edge/10 bg-surface/60 lg:flex" aria-label="Conversations">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="m-0 text-[24px]">Chats</h2>
          <IconButton label="New chat" onClick={newChat}><Compose /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">{list}</div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col" aria-label="Chat">
        {/* Phones and tablets: history and new chat up top. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-edge/[0.08] bg-canvas/80 px-2 py-1.5 backdrop-blur-xl lg:hidden">
          <IconButton label="Chat history" onClick={() => setHistory(true)}><Clock /></IconButton>
          <span className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">{active?.title ?? "New chat"}</span>
          <IconButton label="New chat" onClick={newChat}><Compose /></IconButton>
        </div>
        <div className="hidden shrink-0 items-center justify-between gap-3 px-6 pt-4 lg:flex">
          <span className="min-w-0 truncate text-[16px] font-semibold">{active?.title ?? "New chat"}</span>
          <Credits allowance={first.allowance} left={left} />
        </div>

        <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          <div className="mx-auto flex min-h-full w-full max-w-[780px] flex-col gap-6 px-[18px] pb-6 pt-5 md:px-8 lg:pt-8">
            {!ready && <Notice>Notified AI is being set up. You can write your questions now; answers start once it is switched on.</Notice>}
            {empty && <Welcome onAsk={(q) => setDraft(q)} />}
            {loading && <div className="flex flex-col gap-3 pt-2" role="status" aria-label="Loading chat">{[70, 100, 55].map((w, i) => <div key={i} className="h-12 animate-pulse rounded-[18px] bg-fill" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />)}</div>}
            {messages.map((m, i) => {
              const live = streaming && i === messages.length - 1;
              return m.role === "user"
                ? <UserBubble key={m.id} m={m} canEdit={!streaming && !isTemp(m.id)} onResend={(t) => void send({ question: t, refs: m.files, edit: m.id })} />
                : <AnswerBubble key={m.id} m={m} live={live} chatId={activeId} last={m === lastAnswer && !streaming && !isTemp(m.id)}
                    onRegenerate={() => void send({ regenerate: m.id })}
                    onFlashcards={() => void send({ question: "Make flashcards from your last answer.", refs: [], mode: "flashcards" })}
                    onSave={() => saveAnswer(m.id)} />;
            })}
            {error && <p role="alert" className="m-0 rounded-[14px] bg-red/10 px-3.5 py-2.5 text-[13px] text-red">{error}</p>}
          </div>
        </div>

        {/* The composer: modes above it, what was @-mentioned in it, and the list of things to mention opens over it. */}
        <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 md:px-6">
          <div className="relative mx-auto w-full max-w-[720px]">
            {mention && <MentionList options={options} index={pickIndex} full={attached.length >= MAX_REFS} none={!mentions.length} onPick={pick} onHover={setPickIndex} />}
            <div className="-mx-1 mb-2.5 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div role="radiogroup" aria-label="Study mode" className="flex shrink-0 gap-2">
                {MODE_ORDER.filter((k, i) => moreModes || i < FIRST_MODES || k === mode).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={mode === k} title={MODES[k].hint} onClick={() => setMode(k)}
                    className={`h-11 shrink-0 cursor-pointer rounded-full border px-[18px] text-[15px] font-semibold transition-colors ${mode === k ? "border-blue bg-blue text-white" : "border-edge/15 bg-surface text-ink hover:bg-hover"}`}>
                    {MODES[k].label}
                  </button>
                ))}
              </div>
              <button type="button" aria-expanded={moreModes} onClick={() => setMoreModes((v) => !v)} className="h-11 shrink-0 cursor-pointer border-0 bg-transparent px-2 text-[15px] font-semibold text-link">{moreModes ? "Fewer" : "More modes"}</button>
              <span className="hidden shrink-0 text-[14px] text-faint md:inline">{MODES[mode].hint}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-[22px] border border-edge/15 bg-surface p-2.5 pl-3.5 shadow-[0_8px_24px_rgba(22,26,38,0.06)] focus-within:border-blue">
              {attached.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                  {attached.map((f) => (
                    <span key={`${f.kind}:${f.id}`} className="flex max-w-full items-center gap-1.5 rounded-full bg-fill py-1 pl-2.5 pr-1 text-xs font-medium">
                      <RefGlyph kind={f.kind} name={f.name} />
                      <span className="max-w-[200px] truncate">{f.name}</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setAttached((a) => a.filter((x) => !(x.kind === f.kind && x.id === f.id)))} className="flex size-5 items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-edge/10">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="m2 2 6 6M8 2 2 8" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {attached.length > 0 && !text.trim() && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {(Object.keys(QUICK) as (keyof typeof QUICK)[]).map((k) => (
                    <button key={k} type="button" onClick={() => setDraft(QUICK[k][1])} className="h-7 rounded-full border-0 bg-blue/10 px-3 text-xs font-semibold text-link">{QUICK[k][0]}</button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <button type="button" aria-label="Attach a file, case or topic" title="Attach (@)" disabled={noCredits}
                  onClick={() => { const el = input.current; const at = el?.selectionStart ?? text.length; const pre = text.slice(0, at); const sep = pre && !/\s$/.test(pre) ? " " : ""; setText(pre + sep + "@" + text.slice(at)); setPickerOff(false); requestAnimationFrame(() => { el?.focus(); const c = at + sep.length + 1; el?.setSelectionRange(c, c); setCaret(c); }); }}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-fill text-ink transition-transform active:scale-90 disabled:opacity-40">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M9 3.5v11M3.5 9h11" /></svg>
                </button>
                <textarea ref={input} rows={1} value={text} disabled={noCredits} maxLength={MAX_QUESTION}
                  placeholder={noCredits ? (first.allowance === 0 ? "Your plan has no Notify Credits" : "No Notify Credits left this month") : mode === "quiz" ? "Name a topic to be quizzed on" : "Ask about a case, an Act or a topic…"}
                  aria-label="Message Notified AI"
                  onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); setPickerOff(false); setPickIndex(0); grow(); }}
                  onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                  onKeyDown={onKey}
                  className="max-h-[180px] min-h-11 min-w-0 flex-1 resize-none self-center border-0 bg-transparent px-1 py-2.5 text-[17px] leading-[1.35] text-ink outline-none placeholder:text-faint disabled:opacity-60" />
                {hearing && !streaming && (
                  <button type="button" aria-label={listening ? "Stop dictating" : "Dictate"} aria-pressed={listening} disabled={noCredits} onClick={toggleVoice}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full border-0 transition-transform active:scale-90 disabled:opacity-40 ${listening ? "animate-pulse bg-red text-white" : "bg-transparent text-muted hover:bg-fill"}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="6.5" y="2" width="5" height="9" rx="2.5" /><path d="M3.8 8.5a5.2 5.2 0 0 0 10.4 0M9 13.7V16" /></svg>
                  </button>
                )}
                {streaming ? (
                  <button type="button" aria-label="Stop" onClick={() => abort.current?.abort()} className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-strong text-strong-fg transition-transform active:scale-90">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><rect width="12" height="12" rx="2.5" fill="currentColor" /></svg>
                  </button>
                ) : (
                  <button type="button" disabled={!text.trim() || noCredits || short} onClick={() => void send()} className="flex h-11 shrink-0 cursor-pointer items-center rounded-full border-0 bg-blue px-5 text-[16px] font-semibold text-white transition-[transform,opacity] active:scale-95 disabled:opacity-30">
                    Ask
                  </button>
                )}
              </div>
            </div>
            <p className="m-0 px-2 pt-2 text-center text-[12px] leading-snug text-faint">
              {short ? <span className="font-medium text-red" role="alert">This question needs {cost} credits and you have {left}. Attach less, or change the mode.</span>
                : <>This will use {cost} {cost === 1 ? "credit" : "credits"}{attachedChars > 8_000 ? " (long documents cost more)" : ""}. Notified AI can make mistakes: check important points against the law itself.</>}
              <span className="lg:hidden"> · <Credits allowance={first.allowance} left={left} inline /></span>
            </p>
          </div>
        </div>
      </section>

      {history && <HistorySheet onClose={() => setHistory(false)} onNew={newChat}>{list}</HistorySheet>}
    </div>
  );
}

// ---- Messages -----------------------------------------------------------------------------------------------------

function Welcome({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div className="flex flex-col gap-6 pt-3">
      <div className="flex flex-col gap-2.5">
        <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">What are we working on?</h1>
        <p className="m-0 max-w-[560px] text-[17px] leading-normal text-muted">
          Answers from Ghanaian law only, with the cases and Acts behind them. Type <b className="rounded bg-fill px-1.5 py-0.5 font-semibold text-ink">@</b> to bring in your <Link href="/files" className="text-link">files</Link>, <Link href="/case-law" className="text-link">case briefs</Link> or library topics.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {SUGGESTIONS.map(([k, q]) => (
          <button key={q} type="button" onClick={() => onAsk(q)} className="flex min-h-[110px] cursor-pointer flex-col gap-1.5 rounded-2xl border border-edge/[0.12] bg-surface p-[18px] text-left text-ink transition-shadow hover:shadow-card-hover">
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{k}</span>
            <span className="text-[17px] leading-[1.35]">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ m, canEdit, onResend }: { m: Msg; canEdit: boolean; onResend: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  return (
    <div className="group flex flex-col items-end gap-1.5">
      {m.files.length > 0 && (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {m.files.map((f) => <Link key={`${f.kind}:${f.id}`} href={f.href} className="flex max-w-full items-center gap-1.5 rounded-full bg-fill px-2.5 py-1 text-xs font-medium" style={{ textDecoration: "none", color: "inherit" }}><RefGlyph kind={f.kind} name={f.name} /><span className="truncate">{f.name}</span></Link>)}
        </div>
      )}
      {editing ? (
        <div className="flex w-full max-w-[85%] flex-col gap-2 rounded-[20px] bg-surface p-2.5 shadow-[0_0_0_2px_var(--color-blue)]">
          <textarea autoFocus value={draft} maxLength={MAX_QUESTION} onChange={(e) => setDraft(e.target.value)} rows={Math.min(8, Math.max(2, draft.split("\n").length))} aria-label="Edit your question"
            className="w-full resize-none border-0 bg-transparent text-[16px] leading-[1.4] text-ink outline-none" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setDraft(m.content); }} className="h-8 rounded-full border-0 bg-fill px-3.5 text-[13px] font-medium">Cancel</button>
            <button type="button" disabled={!draft.trim()} onClick={() => { setEditing(false); onResend(draft); }} className="h-8 rounded-full border-0 bg-blue px-3.5 text-[13px] font-semibold text-white disabled:opacity-40">Send again</button>
          </div>
          <p className="m-0 text-[11px] text-faint">This replaces the answers after it.</p>
        </div>
      ) : (
        <div className="flex max-w-[85%] items-end gap-1">
          {canEdit && (
            <button type="button" aria-label="Edit question" onClick={() => setEditing(true)} className="mb-1 flex size-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-faint opacity-70 hover:bg-fill hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10.8 2.7a1.6 1.6 0 0 1 2.3 2.3L6 12.2 2.8 13.2l1-3.2z" /></svg>
            </button>
          )}
          <div className="whitespace-pre-wrap break-words rounded-[18px] rounded-br-[4px] bg-blue px-[18px] py-3.5 text-[17px] leading-[1.45] text-white">{m.content}</div>
        </div>
      )}
    </div>
  );
}

function AnswerBubble({ m, live, chatId, last, onRegenerate, onFlashcards, onSave }: {
  m: Msg; live: boolean; chatId: string | null; last: boolean; onRegenerate: () => void; onFlashcards: () => void; onSave: () => Promise<string | null>;
}) {
  const [copied, setCopied] = useState(false);
  const [save, setSave] = useState<{ s: "idle" | "saving" | "saved" } | { s: "error"; text: string }>({ s: "idle" });
  const done = m.content && !live && !isTemp(m.id);
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-edge/10 bg-surface p-5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Notified AI</span>
      <div className="min-w-0">
        {m.content ? (
          <div className="text-[17px] leading-[1.6] [&>*:first-child]:mt-0">
            <Markdown source={withCitations(m.content, m.files)} from={3} />
            {live && <span aria-hidden className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-faint align-middle" />}
          </div>
        ) : (
          <div role="status" aria-label="Thinking" className="flex h-7 items-center gap-1">
            {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${i * 160}ms` }} />)}
          </div>
        )}
        {m.content && m.files.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="sr-only">Sources</span>
            {m.files.map((f, i) => (
              <Link key={`${f.kind}:${f.id}`} href={f.href} className="flex max-w-full items-center gap-1.5 rounded-full bg-peach py-1.5 pl-2 pr-3 text-[14px] text-[var(--peach-fg)]" style={{ textDecoration: "none" }}>
                <span className="text-[12px] font-bold">{i + 1}</span><span className="max-w-[220px] truncate">{f.name}</span>
              </Link>
            ))}
          </div>
        )}
        {done && (
          <div className="mt-1.5 flex flex-wrap items-center gap-0.5 text-xs font-medium text-muted">
            <Action onClick={() => { void navigator.clipboard?.writeText(m.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }} icon={<path d="M5.5 5.5h8v8h-8zM10.5 5.5v-1A1.8 1.8 0 0 0 8.7 2.7H4.5a1.8 1.8 0 0 0-1.8 1.8v4.2a1.8 1.8 0 0 0 1.8 1.8h1" />}>{copied ? "Copied" : "Copy"}</Action>
            {chatId && (save.s === "saved"
              ? <Link href="/files" className="flex h-7 items-center gap-1.5 rounded-full px-2 text-green" style={{ textDecoration: "none" }}>Saved · View</Link>
              : <Action disabled={save.s === "saving"} onClick={async () => { setSave({ s: "saving" }); const err = await onSave(); setSave(err ? { s: "error", text: err } : { s: "saved" }); }} icon={<path d="M4 2.5h6l2.5 2.5v8.5H4zM6 2.5v3h4v-3M6 13.5V9h4v4.5" />}>{save.s === "saving" ? "Saving…" : "Save to My Files"}</Action>)}
            {last && <Action onClick={onRegenerate} icon={<path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.5v2.8h-2.8" />}>Regenerate</Action>}
            {last && <Action onClick={onFlashcards} icon={<path d="M3.5 4.5h8A1.5 1.5 0 0 1 13 6v6.5a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 12.5V6a1.5 1.5 0 0 1 1.5-1.5zM5 2.5h7.5A1.5 1.5 0 0 1 14 4v6" />}>Flashcards</Action>}
          </div>
        )}
        {save.s === "error" && <p role="alert" className="m-0 mt-1 text-xs text-red">{save.text}</p>}
      </div>
    </div>
  );
}

const Action = ({ onClick, icon, children, disabled }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode; disabled?: boolean }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex h-7 items-center gap-1.5 rounded-full border-0 bg-transparent px-2 text-xs font-medium text-muted hover:bg-fill disabled:opacity-50">
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{icon}</svg>
    {children}
  </button>
);

/** What matches the text after "@", grouped as files, case briefs and library topics: a card above the composer, the first match ready for Return. */
function MentionList({ options, index, full, none, onPick, onHover }: { options: Mentionable[]; index: number; full: boolean; none: boolean; onPick: (m: Mentionable) => void; onHover: (i: number) => void }) {
  const TITLES: Record<RefKind, string> = { file: "My Files", case: "Case law", topic: "Library" };
  return (
    <div role="listbox" aria-label="Files, cases and topics" className="absolute inset-x-0 bottom-full z-30 mb-2 max-h-[min(340px,48dvh)] overflow-y-auto overscroll-contain rounded-[18px] bg-surface/95 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--hairline)] backdrop-blur-xl animate-[tt-pop_140ms_ease-out]">
      {full ? <Hint>You can attach up to {MAX_REFS} things to one question.</Hint>
        : options.length === 0 ? <Hint>{none ? <>Nothing to attach yet. <Link href="/files" className="text-link">Upload a file in My Files</Link>.</> : "Nothing matches."}</Hint>
        : options.map((m, i) => (
          <div key={`${m.kind}:${m.id}`}>
            {(i === 0 || options[i - 1].kind !== m.kind) && <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{TITLES[m.kind]}</div>}
            <button type="button" role="option" aria-selected={i === index} onMouseEnter={() => onHover(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(m)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-[12px] border-0 px-2.5 text-left ${i === index ? "bg-fill" : "bg-transparent"}`}>
              <RefGlyph kind={m.kind} name={m.name} large />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-medium">{m.name}</span>
                <span className="truncate text-xs text-muted">{m.sub}</span>
              </span>
            </button>
          </div>
        ))}
    </div>
  );
}

const Hint = ({ children }: { children: React.ReactNode }) => <p className="m-0 px-2.5 py-3 text-[13px] text-muted">{children}</p>;
const Notice = ({ children }: { children: React.ReactNode }) => <p role="status" className="m-0 rounded-[14px] bg-fill px-3.5 py-2.5 text-[13px] leading-snug text-muted">{children}</p>;

/** A small badge for what was attached: red PDF, blue Word, orange case, green topic. */
function RefGlyph({ kind, name, large }: { kind: RefKind; name: string; large?: boolean }) {
  const [label, bg] = kind === "case" ? ["LAW", "bg-[#C4552B]"] : kind === "topic" ? ["LIB", "bg-[#34c759]"] : /\.pdf$/i.test(name) ? ["PDF", "bg-[#ff3b30]"] : ["DOC", "bg-[#0a84ff]"];
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-[7px] font-bold text-white ${bg} ${large ? "size-9 text-[9px]" : "size-5 text-[7px]"}`}>{label}</span>;
}

function Credits({ allowance, left, inline }: { allowance: number; left: number; inline?: boolean }) {
  if (allowance === 0) return <Link href="/plans" className={`text-xs font-medium text-link ${inline ? "" : "rounded-full bg-fill px-3 py-1.5"}`} style={{ textDecoration: "none" }}>Get Notify Credits</Link>;
  return <span className={inline ? "" : "rounded-full bg-fill px-3 py-1.5 text-xs font-medium text-muted"}>{left} of {allowance} credits left</span>;
}

const IconButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className="flex size-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-link transition-colors hover:bg-fill active:bg-fill">{children}</button>
);
const Compose = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5V11" /><path d="m15.2 3.8 1 1a1.4 1.4 0 0 1 0 2L10 13l-3 .6.6-3 6.2-6.2a1.4 1.4 0 0 1 2 0z" /></svg>;
const Clock = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.6 1.6" /></svg>;

// ---- Conversations ------------------------------------------------------------------------------------------------

/** Conversations: Pinned, then Today, Yesterday, the last 7 days and earlier. A ⋯ menu renames, pins or deletes. */
function ChatList({ chats, activeId, onOpen, onDelete, onPatch }: {
  chats: ChatSummary[]; activeId: string | null; onOpen: (id: string) => void; onDelete: (id: string) => void; onPatch: (id: string, set: { title?: string; pinned?: boolean }) => void;
}) {
  const [menu, setMenu] = useState<{ id: string; sure: boolean } | null>(null);
  const [rename, setRename] = useState<{ id: string; value: string } | null>(null);
  const groups = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const day = 86_400_000;
    const out: [string, ChatSummary[]][] = [["Pinned", []], ["Today", []], ["Yesterday", []], ["Previous 7 days", []], ["Earlier", []]];
    for (const c of [...chats].sort((a, b) => b.updatedAt - a.updatedAt)) {
      const age = start.getTime() - c.updatedAt;
      out[c.pinned ? 0 : age < 0 ? 1 : age < day ? 2 : age < 7 * day ? 3 : 4][1].push(c);
    }
    return out.filter(([, v]) => v.length);
  }, [chats]);
  const close = useCallback(() => setMenu(null), []);
  useEffect(() => {
    if (!menu) return;
    const away = (e: PointerEvent) => { if (!(e.target as Element).closest("[data-chat-menu]")) close(); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [menu, close]);
  if (!chats.length) return <p className="m-0 px-3 py-6 text-center text-[13px] text-muted">Your conversations appear here.</p>;
  return (
    <div className="flex flex-col gap-3">
      {groups.map(([name, items]) => (
        <div key={name}>
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{name}</div>
          {items.map((c) => (
            <div key={c.id} data-chat-menu className={`group relative flex items-center rounded-[10px] ${c.id === activeId ? "bg-fill" : "hover:bg-fill/60"}`}>
              {rename?.id === c.id ? (
                <input autoFocus value={rename.value} maxLength={80} aria-label="Chat name" onChange={(e) => setRename({ id: c.id, value: e.target.value })} onBlur={() => setRename(null)}
                  onKeyDown={(e) => { if (e.key === "Escape") setRename(null); if (e.key === "Enter" && rename.value.trim()) { onPatch(c.id, { title: rename.value.trim() }); setRename(null); } }}
                  className="m-1 h-9 min-w-0 flex-1 rounded-[8px] border-0 bg-surface px-2.5 text-[14px] text-ink shadow-[0_0_0_2px_var(--color-blue)] outline-none" />
              ) : (
                <button type="button" onClick={() => onOpen(c.id)} aria-current={c.id === activeId} className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 border-0 bg-transparent px-3 text-left text-[14px] text-ink">
                  {c.pinned && <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" className="shrink-0 text-faint" aria-label="Pinned"><path d="M9.5 1.5 14.5 6.5l-2 .5-2.5 2.5.5 3.5-1 1-3-3-4 4-1-1 4-4-3-3 1-1 3.5.5L9 4z" /></svg>}
                  <span className="truncate">{c.title}</span>
                </button>
              )}
              {rename?.id !== c.id && (
                <button type="button" aria-label={`Actions for ${c.title}`} aria-expanded={menu?.id === c.id} onClick={() => setMenu(menu?.id === c.id ? null : { id: c.id, sure: false })}
                  className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-[18px] leading-none text-faint opacity-70 hover:bg-edge/10 hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100">⋯</button>
              )}
              {menu?.id === c.id && (
                <div role="menu" className="absolute right-1 top-full z-20 mt-1 w-44 rounded-[14px] bg-surface p-1 shadow-[0_12px_36px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--hairline)] animate-[tt-pop_140ms_ease-out]">
                  <MenuItem onClick={() => { setRename({ id: c.id, value: c.title }); close(); }}>Rename</MenuItem>
                  <MenuItem onClick={() => { onPatch(c.id, { pinned: !c.pinned }); close(); }}>{c.pinned ? "Unpin" : "Pin"}</MenuItem>
                  <MenuItem danger onClick={() => (menu.sure ? (onDelete(c.id), close()) : setMenu({ id: c.id, sure: true }))}>{menu.sure ? "Tap again to delete" : "Delete"}</MenuItem>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const MenuItem = ({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) => (
  <button type="button" role="menuitem" onClick={onClick} className={`flex min-h-10 w-full items-center rounded-[10px] border-0 bg-transparent px-3 text-left text-[14px] hover:bg-fill ${danger ? "text-red" : "text-ink"}`}>{children}</button>
);

/** Phones and tablets: the conversations as a bottom sheet, as in the filter sheets elsewhere. */
function HistorySheet({ onClose, onNew, children }: { onClose: () => void; onNew: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
      <div onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" style={{ animation: "tt-fade 0.25s ease-out" }} />
      <div className="relative flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.25)] md:max-w-[460px] md:rounded-[28px]" style={{ animation: "tt-sheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)" }}>
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-faint/40 md:hidden" />
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
          <button type="button" onClick={onNew} className="justify-self-start border-0 bg-transparent text-[17px] text-link">New</button>
          <h2 className="m-0 text-[17px] font-semibold">Chats</h2>
          <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
