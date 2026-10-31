"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { MAX_MESSAGE, dayOf } from "@/lib/friend-view";

export type ChatMessage = { id: string; fromMe: boolean; body: string; at: number; fromId?: string; name?: string; avatar?: string | null; pending?: boolean };

const dayLabel = (at: number, now: number) => {
  const d = dayOf(at);
  if (d === dayOf(now)) return "Today";
  if (d === dayOf(now - 86_400_000)) return "Yesterday";
  return new Date(at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
};
const clock = (at: number) => new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/**
 * A conversation's messages as iOS bubbles, and the composer. Groups show who wrote each run of messages. Holding or
 * right-clicking someone else's message offers Report. `onSend` returns an error message, or null once sent.
 */
export function ChatView({ header, messages, rule, empty, status, group, now, onSend, onReport }: {
  header: React.ReactNode; messages: ChatMessage[]; rule: string; empty: string; now: number; group?: boolean;
  /** Shown under your newest sent message, e.g. "Seen". */
  status?: (m: ChatMessage) => string | null;
  onSend: (body: string) => Promise<string | null>;
  onReport: (m: ChatMessage) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Stay at the newest message unless the reader has scrolled up to older ones.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Grow the box with its text, up to about five lines.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setError("");
    atBottom.current = true;
    setText("");
    const err = await onSend(body);
    if (err) { setText(body); setError(err); }
    box.current?.focus();
  }

  const lastMine = messages.findLast((m) => m.fromMe && !m.pending);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-6">
        <p className="mx-auto mb-4 mt-0 flex max-w-[340px] items-start justify-center gap-1.5 text-center text-[12px] leading-snug text-muted">
          <Icon name="lock" size={11} className="mt-[3px] shrink-0" /><span>{rule}</span>
        </p>
        {!messages.length && <p className="m-0 mt-10 text-center text-[15px] text-muted">{empty}</p>}
        <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
            const sameAsPrev = prev && !newDay && prev.fromId === m.fromId && prev.fromMe === m.fromMe && m.at - prev.at <= 5 * 60_000;
            const tail = !next || next.fromMe !== m.fromMe || next.fromId !== m.fromId || dayOf(next.at) !== dayOf(m.at) || next.at - m.at > 5 * 60_000;
            const showName = group && !m.fromMe && !sameAsPrev;
            const st = m === lastMine ? status?.(m) : null;
            return (
              <li key={m.id} className="flex flex-col">
                {newDay && <span className="my-3 text-center text-[12px] font-medium text-muted">{dayLabel(m.at, now)}</span>}
                {showName && <span className="mb-0.5 ml-11 mt-1 text-[12px] font-medium text-muted">{m.name}</span>}
                <div className={`flex items-end gap-2 ${m.fromMe ? "justify-end" : "justify-start"} ${tail ? "mb-1.5" : ""}`}>
                  {group && !m.fromMe && (tail ? <Avatar id={m.fromId ?? m.id} name={m.name ?? ""} src={m.avatar} size={28} /> : <span className="w-7 shrink-0" />)}
                  <p title={clock(m.at)}
                    onContextMenu={m.fromMe || m.pending ? undefined : (e) => { e.preventDefault(); setMenu(m.id); }}
                    onTouchStart={m.fromMe || m.pending ? undefined : () => { press.current = setTimeout(() => setMenu(m.id), 500); }}
                    onTouchEnd={() => clearTimeout(press.current)} onTouchMove={() => clearTimeout(press.current)}
                    className={`m-0 max-w-[78%] select-text whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[16px] leading-snug md:max-w-[65%] ${
                      m.fromMe ? `bg-blue text-white ${tail ? "rounded-br-[6px]" : ""} ${m.pending ? "opacity-60" : ""}` : `bg-surface text-ink shadow-card ${tail ? "rounded-bl-[6px]" : ""}`}`}>{m.body}</p>
                </div>
                {menu === m.id && (
                  <div className={`mb-2 flex gap-2 ${group ? "ml-9" : ""}`}>
                    <button type="button" onClick={() => { setMenu(null); onReport(m); }} className="h-8 rounded-full border-0 bg-red/10 px-3.5 text-[14px] font-semibold text-red">Report message</button>
                    <button type="button" onClick={() => setMenu(null)} className="h-8 rounded-full border-0 bg-fill px-3.5 text-[14px] text-ink">Cancel</button>
                  </div>
                )}
                {st && <span className="-mt-1 mb-1 pr-1 text-right text-[11px] text-muted">{st}</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex shrink-0 flex-col gap-1 border-t-[0.5px] border-edge/15 bg-surface/80 px-3 py-2 backdrop-blur-xl md:px-6">
        {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">Message</label>
          <textarea id="message" ref={box} rows={1} value={text} maxLength={MAX_MESSAGE} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends on a keyboard; on touch screens the return key adds a line, as in Messages.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia("(hover: hover)").matches) { e.preventDefault(); void send(); }
            }}
            placeholder="Message" className="min-h-[38px] min-w-0 flex-1 resize-none rounded-[19px] border-[0.5px] border-edge/20 bg-canvas px-3.5 py-[7px] text-[16px] leading-snug text-ink outline-none placeholder:text-faint focus:border-blue/50" />
          <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid size-[38px] shrink-0 place-items-center rounded-full border-0 bg-blue text-white transition-opacity disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
}

/** A round icon button for conversation headers (call, video, info). */
export function HeaderButton({ label, onClick, children, tone }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "green" }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`grid size-9 shrink-0 place-items-center rounded-full border-0 active:opacity-60 ${tone === "green" ? "bg-green text-white" : "bg-fill text-blue"}`}>{children}</button>
  );
}

export const PhoneIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
);
export const VideoIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm13 4 4-2.5v9L17 14z" /></svg>
);
export const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>
);
