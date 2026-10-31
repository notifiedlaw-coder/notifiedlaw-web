"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { MAX_MESSAGE, TYPING_PING_MS, dayOf, type Typer } from "@/lib/friend-view";

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
 * right-clicking someone else's message offers Report. `onSend` returns an error message, or null once sent; without
 * it the conversation is read-only and `closed` explains why in place of the composer.
 * `typers` shows the typing bubble; `onTyping` tells the others while the user types (see TYPING_PING_MS).
 */
export function ChatView({ header, messages, rule, empty, status, group, now, typers = [], onSend, onReport, onTyping, closed }: {
  header: React.ReactNode; messages: ChatMessage[]; rule: string; empty: string; now: number; group?: boolean;
  /** Shown under your newest sent message, e.g. "Seen". */
  status?: (m: ChatMessage) => string | null;
  onSend?: (body: string) => Promise<string | null>;
  closed?: string;
  onReport: (m: ChatMessage) => void;
  typers?: Typer[];
  onTyping?: (on: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const press = useRef<ReturnType<typeof setTimeout>>(undefined);
  // When the last typing ping went out (0: not typing), as WhatsApp does it: a ping only on a keystroke, at most every
  // few seconds, so a pause lets the bubble lapse on its own; clearing the box or leaving it stops it at once.
  const pinged = useRef(0);
  const typingRef = useRef(onTyping);
  useEffect(() => { typingRef.current = onTyping; }, [onTyping]);
  const stopTyping = () => { if (pinged.current) { pinged.current = 0; typingRef.current?.(false); } };
  useEffect(() => () => { if (pinged.current) typingRef.current?.(false); }, []);

  function edit(value: string) {
    setText(value);
    if (!value.trim()) return stopTyping();
    if (Date.now() - pinged.current >= TYPING_PING_MS) { pinged.current = Date.now(); onTyping?.(true); }
  }

  // Stay at the newest message (and the typing bubble) unless the reader has scrolled up to older ones.
  const typingShown = typers.length > 0;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, typingShown]);

  // Grow the box with its text, up to about five lines.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  async function send() {
    const body = text.trim();
    if (!body || !onSend) return;
    setError("");
    atBottom.current = true;
    pinged.current = 0; // the server ends the bubble when the message lands
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

      {/* Pinned just above the composer, on the left, so it is seen wherever the conversation is scrolled. */}
      {typingShown && <div className="shrink-0 px-3 pb-1.5 md:px-6"><TypingBubble typers={typers} group={group} /></div>}

      {!onSend ? (
        <p className="m-0 shrink-0 border-t-[0.5px] border-edge/15 bg-surface/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[13px] text-muted backdrop-blur-xl">{closed}</p>
      ) : (
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex shrink-0 flex-col gap-1 border-t-[0.5px] border-edge/15 bg-surface/80 px-3 py-2 backdrop-blur-xl md:px-6">
        {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">Message</label>
          <textarea id="message" ref={box} rows={1} value={text} maxLength={MAX_MESSAGE} onChange={(e) => edit(e.target.value)} onBlur={stopTyping}
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
      )}
    </div>
  );
}

/** "Ama is typing…", "Ama and Kofi are typing…", "3 people are typing…": for headers and the chat list. */
export function typingLabel(typers: Typer[]) {
  const first = (t: Typer) => t.name.split(" ")[0];
  if (typers.length === 1) return `${first(typers[0])} is typing…`;
  if (typers.length === 2) return `${first(typers[0])} and ${first(typers[1])} are typing…`;
  return `${typers.length} people are typing…`;
}

/** Three dots bouncing in a received bubble, as in Messages; in a group, beside the picture of whoever is typing. */
function TypingBubble({ typers, group }: { typers: Typer[]; group?: boolean }) {
  return (
    <div role="status" aria-label={group ? typingLabel(typers) : "Typing"} className="flex w-fit items-end gap-2 animate-[nl-pop_0.2s_ease-out] origin-bottom-left">
      {group && <Avatar id={typers[0].id} name={typers[0].name} src={typers[0].avatar} size={28} />}
      <span className="flex h-[38px] items-center gap-[5px] rounded-[18px] rounded-bl-[6px] bg-surface px-4 shadow-card">
        {[0, 1, 2].map((i) => <span key={i} className="size-[7px] rounded-full bg-muted animate-[nl-typing_1.2s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />)}
      </span>
    </div>
  );
}

/** A round icon button for conversation headers (call, info). */
export function HeaderButton({ label, onClick, children, tone }: { label: string; onClick: () => void; children: React.ReactNode; tone?: "green" }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`grid size-9 shrink-0 place-items-center rounded-full border-0 active:opacity-60 ${tone === "green" ? "bg-green text-white" : "bg-fill text-blue"}`}>{children}</button>
  );
}

export const PhoneIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" /></svg>
);
export const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></svg>
);
