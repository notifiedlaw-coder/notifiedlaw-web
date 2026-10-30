"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import type { ChatFile, ChatSummary, StoredMessage } from "@/lib/ai/chats";
import type { Folder, StoredFile } from "@/lib/files";

const MAX_QUESTION = 4000;
const MAX_FILES = 5;
const SUGGESTIONS = [
  "Explain judicial review under the 1992 Constitution",
  "What makes a contract valid in Ghana?",
  "Walk me through an IRAC answer on negligence",
  "Quiz me on the law of evidence",
];

/** All the user is told about a failure: never the reason, only a code support can look up (src/lib/error-codes.ts). */
const errorText = (code: string) => `An error has occurred please try again later. Error code: ${code}`;

type Msg = Pick<StoredMessage, "id" | "role" | "content" | "files">;

/** The "@name" being typed just before the caret: its query and where it starts, else null. */
function mentionAt(text: string, caret: number) {
  const m = /(^|\s)@([^\s@]{0,40})$/.exec(text.slice(0, caret));
  return m ? { query: m[2], start: caret - m[2].length - 1 } : null;
}

/** Notified AI: a chat with the user's My Files one @ away. Conversations on the left from wide screens, in a sheet below. */
export function NotifiedAi({ chats: initial, credits: first, files, folders, ready }: {
  chats: ChatSummary[]; credits: { allowance: number; left: number }; files: StoredFile[]; folders: Folder[]; ready: boolean;
}) {
  const [chats, setChats] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(first.left);
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<ChatFile[]>([]);
  const [caret, setCaret] = useState(0);
  const [pickerOff, setPickerOff] = useState(false); // Escape closes the list until the next keystroke
  const [pickIndex, setPickIndex] = useState(0);
  const [history, setHistory] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const abort = useRef<AbortController | null>(null);

  const folderName = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const mention = pickerOff ? null : mentionAt(text, caret);
  const matches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return files.filter((f) => !attached.some((a) => a.id === f.id) && f.name.toLowerCase().includes(q)).slice(0, 8);
  }, [mention, files, attached]);
  const noCredits = first.allowance === 0 || left <= 0;
  const active = chats.find((c) => c.id === activeId);

  // Keep the newest text in view while it streams, unless the reader scrolled up.
  useEffect(() => {
    if (stick.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);

  const grow = () => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

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
    else setError(errorText(res ? ((await res.json().catch(() => null)) as { code?: string } | null)?.code ?? `H${res.status}` : "N001"));
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

  function pick(f: StoredFile) {
    if (!mention || attached.length >= MAX_FILES) return;
    const next = text.slice(0, mention.start) + text.slice(caret);
    setText(next);
    setAttached((a) => [...a, { id: f.id, name: f.name }]);
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

  async function send(question = text) {
    const message = question.trim();
    if (!message || streaming || noCredits) return;
    const files = attached;
    setError(null);
    setStreaming(true);
    stick.current = true;
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: message, files };
    const replyId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: replyId, role: "assistant", content: "", files: [] }]);
    setText("");
    setAttached([]);
    requestAnimationFrame(grow);

    const ctl = new AbortController();
    abort.current = ctl;
    const undo = (code: string) => {
      setMessages((m) => m.filter((x) => x.id !== userMsg.id && x.id !== replyId));
      setText(message);
      setAttached(files);
      setError(errorText(code));
    };
    const res = await fetch("/api/ai/chat", {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ chatId: activeId, message, fileIds: files.map((f) => f.id) }),
    }).catch(() => null);
    if (!res || !res.ok || !res.body) {
      setStreaming(false);
      if (ctl.signal.aborted) return;
      return undo(res ? ((await res.json().catch(() => null)) as { code?: string } | null)?.code ?? `H${res.status}` : "N001");
    }

    let chatId = activeId;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
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
          const ev = JSON.parse(line.slice(5)) as { type: string; chatId?: string; text?: string; credits?: number; code?: string };
          if (ev.type === "meta" && ev.chatId) {
            chatId = ev.chatId;
            setActiveId(ev.chatId);
            const id = ev.chatId;
            setChats((c) => (c.some((x) => x.id === id) ? c : [{ id, title: message.replace(/\s+/g, " ").slice(0, 60), updatedAt: Date.now() }, ...c]));
          } else if (ev.type === "delta" && ev.text) {
            const t = ev.text;
            setMessages((m) => m.map((x) => (x.id === replyId ? { ...x, content: x.content + t } : x)));
          } else if (ev.type === "done") {
            if (typeof ev.credits === "number") setLeft(ev.credits);
          } else if (ev.type === "error") {
            setError(errorText(ev.code ?? "AI104"));
            if (typeof ev.credits === "number") setLeft(ev.credits);
          }
        }
      }
    } catch {
      if (!ctl.signal.aborted) setError(errorText("N001"));
    }
    // An answer with nothing in it is not kept (the server gave the credit back).
    setMessages((m) => m.filter((x) => !(x.id === replyId && !x.content)));
    if (chatId) setChats((c) => c.map((x) => (x.id === chatId ? { ...x, updatedAt: Date.now() } : x)).sort((a, b) => b.updatedAt - a.updatedAt));
    setStreaming(false);
    abort.current = null;
    if (ctl.signal.aborted) void fetch("/api/ai/chats").then((r) => r.json() as Promise<{ credits?: { left: number } }>).then((j) => { if (j.credits) setLeft(j.credits.left); }).catch(() => {});
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention && matches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setPickIndex((i) => (i + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setPickIndex((i) => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[Math.min(pickIndex, matches.length - 1)]); return; }
    }
    if (mention && e.key === "Escape") { e.preventDefault(); setPickerOff(true); return; }
    if (e.key === "Enter" && !e.shiftKey && !window.matchMedia("(pointer: coarse)").matches && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
  }

  const list = <ChatList chats={chats} activeId={activeId} onOpen={openChat} onDelete={removeChat} />;
  const empty = !messages.length && !loading;

  return (
    <div className="flex h-full min-h-0 bg-canvas">
      {/* Wide screens: the conversations beside the chat. */}
      <aside className="hidden w-[272px] shrink-0 flex-col border-r border-edge/10 bg-surface/60 lg:flex" aria-label="Conversations">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">Chats</h2>
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
          <span className="min-w-0 truncate text-[15px] font-semibold">{active?.title ?? "New chat"}</span>
          <Credits allowance={first.allowance} left={left} />
        </div>

        <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
          <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col gap-5 px-4 pb-6 pt-5 md:px-6">
            {!ready && <Notice>Notified AI is being set up. You can write your questions now; answers start once it is switched on.</Notice>}
            {empty && <Welcome onAsk={(q) => { setText(q); requestAnimationFrame(() => { input.current?.focus(); grow(); }); }} hasFiles={files.length > 0} />}
            {loading && <div className="flex flex-col gap-3 pt-2" role="status" aria-label="Loading chat">{[70, 100, 55].map((w, i) => <div key={i} className="h-12 animate-pulse rounded-[18px] bg-fill" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />)}</div>}
            {messages.map((m, i) => <Bubble key={m.id} m={m} live={streaming && i === messages.length - 1} />)}
            {error && <p role="alert" className="m-0 rounded-[14px] bg-red/10 px-3.5 py-2.5 text-[13px] text-red">{error}</p>}
          </div>
        </div>

        {/* The composer: files chosen with @ sit above the text; the list opens above it. */}
        <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 md:px-6">
          <div className="relative mx-auto w-full max-w-[720px]">
            {mention && (
              <FilePicker files={matches} index={pickIndex} folderName={folderName} full={attached.length >= MAX_FILES} none={!files.length} onPick={pick} onHover={setPickIndex} />
            )}
            <div className="flex flex-col gap-2 rounded-[24px] bg-surface p-2 shadow-[0_0_0_0.5px_var(--hairline),0_4px_18px_rgba(0,0,0,0.06)] focus-within:shadow-[0_0_0_2px_var(--color-blue)]">
              {attached.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                  {attached.map((f) => (
                    <span key={f.id} className="flex max-w-full items-center gap-1.5 rounded-full bg-fill py-1 pl-2.5 pr-1 text-xs font-medium">
                      <FileGlyph name={f.name} />
                      <span className="max-w-[200px] truncate">{f.name}</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setAttached((a) => a.filter((x) => x.id !== f.id))} className="flex size-5 items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-edge/10">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="m2 2 6 6M8 2 2 8" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <button type="button" aria-label="Attach a file from My Files" title="Attach a file (@)" disabled={noCredits}
                  onClick={() => { const el = input.current; const at = el?.selectionStart ?? text.length; const pre = text.slice(0, at); const sep = pre && !/\s$/.test(pre) ? " " : ""; setText(pre + sep + "@" + text.slice(at)); setPickerOff(false); requestAnimationFrame(() => { el?.focus(); const c = at + sep.length + 1; el?.setSelectionRange(c, c); setCaret(c); }); }}
                  className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-fill text-ink transition-transform active:scale-90 disabled:opacity-40">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M9 3.5v11M3.5 9h11" /></svg>
                </button>
                <textarea ref={input} rows={1} value={text} disabled={noCredits} maxLength={MAX_QUESTION}
                  placeholder={noCredits ? (first.allowance === 0 ? "Your plan has no Notify Credits" : "No Notify Credits left this month") : "Ask about Ghanaian law, or type @ for a file"}
                  aria-label="Message Notified AI"
                  onChange={(e) => { setText(e.target.value); setCaret(e.target.selectionStart); setPickerOff(false); setPickIndex(0); grow(); }}
                  onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                  onKeyDown={onKey}
                  className="max-h-[180px] min-h-9 min-w-0 flex-1 resize-none self-center border-0 bg-transparent px-1 py-1.5 text-[16px] leading-[1.35] text-ink outline-none placeholder:text-faint disabled:opacity-60" />
                {streaming ? (
                  <button type="button" aria-label="Stop" onClick={() => abort.current?.abort()} className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-strong text-strong-fg transition-transform active:scale-90">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><rect width="12" height="12" rx="2.5" fill="currentColor" /></svg>
                  </button>
                ) : (
                  <button type="button" aria-label="Send" disabled={!text.trim() || noCredits} onClick={() => void send()} className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-blue text-white transition-[transform,opacity] active:scale-90 disabled:opacity-30">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 14.5v-11M4.5 8 9 3.5 13.5 8" /></svg>
                  </button>
                )}
              </div>
            </div>
            <p className="m-0 px-2 pt-2 text-center text-[11px] leading-snug text-faint">
              Notified AI can make mistakes. Check important points against the law itself.
              <span className="lg:hidden"> · <Credits allowance={first.allowance} left={left} inline /></span>
            </p>
          </div>
        </div>
      </section>

      {history && <HistorySheet onClose={() => setHistory(false)} onNew={newChat}>{list}</HistorySheet>}
    </div>
  );
}

// ---- Pieces -------------------------------------------------------------------------------------------------------

function Welcome({ onAsk, hasFiles }: { onAsk: (q: string) => void; hasFiles: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
      <div aria-hidden className="grid size-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#5e5ce6] via-[#bf5af2] to-[#ff9f0a] text-white shadow-[0_8px_24px_rgba(94,92,230,0.35)]">
        <svg width="30" height="30" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.8l1.6 4.6L14.2 8l-4.6 1.6L8 14.2 6.4 9.6 1.8 8l4.6-1.6z" /></svg>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-[28px] font-bold leading-tight tracking-[-0.03em]">Ask about Ghanaian law</h2>
        <p className="m-0 max-w-[420px] text-[15px] leading-snug text-muted">
          {hasFiles ? <>Type <b className="rounded bg-fill px-1.5 py-0.5 font-semibold text-ink">@</b> to bring one of your files into the question.</> : <>Upload notes or cases in <Link href="/files" className="text-link">My Files</Link>, then type <b className="rounded bg-fill px-1.5 py-0.5 font-semibold text-ink">@</b> to ask about them.</>}
        </p>
      </div>
      <div className="grid w-full max-w-[520px] gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q) => (
          <button key={q} type="button" onClick={() => onAsk(q)} className="rounded-[16px] border-0 bg-surface p-3.5 text-left text-[14px] leading-snug text-ink shadow-card transition-transform active:scale-[0.98]">{q}</button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ m, live }: { m: Msg; live: boolean }) {
  const [copied, setCopied] = useState(false);
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.files.length > 0 && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
            {m.files.map((f) => <span key={f.id} className="flex max-w-full items-center gap-1.5 rounded-full bg-fill px-2.5 py-1 text-xs font-medium"><FileGlyph name={f.name} /><span className="truncate">{f.name}</span></span>)}
          </div>
        )}
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-[6px] bg-blue px-4 py-2.5 text-[16px] leading-[1.4] text-white">{m.content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5e5ce6] via-[#bf5af2] to-[#ff9f0a] text-white">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.8l1.6 4.6L14.2 8l-4.6 1.6L8 14.2 6.4 9.6 1.8 8l4.6-1.6z" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        {m.content ? (
          <div className="text-[16px] leading-[1.55] [&>*:first-child]:mt-0">
            <Markdown source={m.content} from={3} />
            {live && <span aria-hidden className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-faint align-middle" />}
          </div>
        ) : (
          <div role="status" aria-label="Thinking" className="flex h-7 items-center gap-1">
            {[0, 1, 2].map((i) => <span key={i} className="size-2 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${i * 160}ms` }} />)}
          </div>
        )}
        {m.content && !live && (
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(m.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }); }}
            className="mt-1.5 flex h-7 items-center gap-1.5 rounded-full border-0 bg-transparent px-2 text-xs font-medium text-muted hover:bg-fill">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden><rect x="5.5" y="5.5" width="8" height="8" rx="1.8" /><path d="M10.5 5.5v-1A1.8 1.8 0 0 0 8.7 2.7H4.5a1.8 1.8 0 0 0-1.8 1.8v4.2a1.8 1.8 0 0 0 1.8 1.8h1" /></svg>
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

/** The files matching what follows "@": a card above the composer, the first match ready for Return. */
function FilePicker({ files, index, folderName, full, none, onPick, onHover }: {
  files: StoredFile[]; index: number; folderName: Map<string, string>; full: boolean; none: boolean; onPick: (f: StoredFile) => void; onHover: (i: number) => void;
}) {
  return (
    <div role="listbox" aria-label="Your files" className="absolute inset-x-0 bottom-full z-30 mb-2 max-h-[min(320px,45dvh)] overflow-y-auto overscroll-contain rounded-[18px] bg-surface/95 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--hairline)] backdrop-blur-xl animate-[tt-pop_140ms_ease-out]">
      <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">My Files</div>
      {full ? <Hint>You can attach up to {MAX_FILES} files to one question.</Hint>
        : files.length === 0 ? <Hint>{none ? <>You have no files yet. <Link href="/files" className="text-link">Upload one in My Files</Link>.</> : "No file matches."}</Hint>
        : files.map((f, i) => (
          <button key={f.id} type="button" role="option" aria-selected={i === index} onMouseEnter={() => onHover(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(f)}
            className={`flex min-h-12 w-full items-center gap-3 rounded-[12px] border-0 px-2.5 text-left ${i === index ? "bg-fill" : "bg-transparent"}`}>
            <FileGlyph name={f.name} large />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-medium">{f.name}</span>
              <span className="truncate text-xs text-muted">{f.folderId ? folderName.get(f.folderId) ?? "Folder" : "My Files"} · {f.kind.toUpperCase()}</span>
            </span>
          </button>
        ))}
    </div>
  );
}

const Hint = ({ children }: { children: React.ReactNode }) => <p className="m-0 px-2.5 py-3 text-[13px] text-muted">{children}</p>;
const Notice = ({ children }: { children: React.ReactNode }) => <p role="status" className="m-0 rounded-[14px] bg-fill px-3.5 py-2.5 text-[13px] leading-snug text-muted">{children}</p>;

function FileGlyph({ name, large }: { name: string; large?: boolean }) {
  const pdf = /\.pdf$/i.test(name);
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-[7px] font-bold text-white ${large ? "size-9 text-[9px]" : "size-5 text-[7px]"} ${pdf ? "bg-[#ff3b30]" : "bg-[#0a84ff]"}`}>{pdf ? "PDF" : "DOC"}</span>
  );
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

/** Conversations grouped as Today, Yesterday, the last 7 days, then older; a tap opens one, a second tap on the bin deletes it. */
function ChatList({ chats, activeId, onOpen, onDelete }: { chats: ChatSummary[]; activeId: string | null; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  const [sure, setSure] = useState<string | null>(null);
  const groups = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const day = 86_400_000;
    const out: [string, ChatSummary[]][] = [["Today", []], ["Yesterday", []], ["Previous 7 days", []], ["Earlier", []]];
    for (const c of chats) {
      const age = start.getTime() - c.updatedAt;
      out[age < 0 ? 0 : age < day ? 1 : age < 7 * day ? 2 : 3][1].push(c);
    }
    return out.filter(([, v]) => v.length);
  }, [chats]);
  const close = useCallback(() => setSure(null), []);
  if (!chats.length) return <p className="m-0 px-3 py-6 text-center text-[13px] text-muted">Your conversations appear here.</p>;
  return (
    <div className="flex flex-col gap-3" onMouseLeave={close}>
      {groups.map(([name, items]) => (
        <div key={name}>
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{name}</div>
          {items.map((c) => (
            <div key={c.id} className={`group flex items-center rounded-[10px] ${c.id === activeId ? "bg-fill" : "hover:bg-fill/60"}`}>
              <button type="button" onClick={() => onOpen(c.id)} aria-current={c.id === activeId} className="min-h-11 min-w-0 flex-1 truncate border-0 bg-transparent px-3 text-left text-[14px] text-ink">{c.title}</button>
              {sure === c.id ? (
                <button type="button" onClick={() => onDelete(c.id)} className="mr-1.5 h-7 rounded-full border-0 bg-red px-2.5 text-xs font-semibold text-white">Delete</button>
              ) : (
                <button type="button" aria-label={`Delete ${c.title}`} onClick={() => setSure(c.id)} className="mr-1 flex size-8 items-center justify-center rounded-full border-0 bg-transparent text-faint opacity-60 hover:bg-edge/10 hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 4.5h11M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M4 4.5l.7 8.6A1 1 0 0 0 5.7 14h4.6a1 1 0 0 0 1-.9l.7-8.6" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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
