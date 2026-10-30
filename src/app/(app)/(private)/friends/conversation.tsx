"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFriends } from "@/components/friends";
import { Icon } from "@/components/icons";
import { MAX_MESSAGE, ONLINE_MS, dayOf, seenLabel, type Message } from "@/lib/friend-view";
import { Avatar, StreakTag, useFriendsShell } from "./friends-shell";

/** How often an open conversation checks for new messages while the page is visible. */
const POLL_MS = 4_000;

type Pending = Message & { pending?: boolean };

const dayLabel = (at: number, now: number) => {
  const d = dayOf(at);
  if (d === dayOf(now)) return "Today";
  if (d === dayOf(now - 86_400_000)) return "Yesterday";
  return new Date(at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
};
const clock = (at: number) => new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

/** A conversation with one friend: messages as iOS bubbles, polled while open, and a composer. */
export function Conversation({ friendId, initial, initialSeen }: { friendId: string; initial: Message[]; initialSeen: number | null }) {
  const { lists, reloadThreads, now } = useFriendsShell();
  const { refresh } = useFriends();
  const friend = lists.friends.find((f) => f.id === friendId);
  const [messages, setMessages] = useState<Pending[]>(initial);
  const [seen, setSeen] = useState(initialSeen);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);

  // Opening the conversation read the friend's messages on the server: update the list and the badge.
  useEffect(() => { reloadThreads(); refresh(); }, [reloadThreads, refresh]);

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const last = messages.findLast((m) => !m.pending)?.at ?? 0;
    try {
      const r = await fetch(`/api/messages/${encodeURIComponent(friendId)}${last ? `?after=${last}` : ""}`);
      if (!r.ok) return;
      const d = (await r.json()) as { messages: Message[]; seen: number | null };
      setSeen(d.seen);
      if (!d.messages.length) return;
      setMessages((cur) => {
        const ids = new Set(cur.map((m) => m.id));
        const fresh = d.messages.filter((m) => !ids.has(m.id));
        return fresh.length ? [...cur, ...fresh] : cur;
      });
      if (d.messages.some((m) => !m.fromMe)) { reloadThreads(); refresh(); }
    } catch {}
  }, [friendId, messages, reloadThreads, refresh]);

  useEffect(() => {
    const t = setInterval(poll, POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", poll); };
  }, [poll]);

  // Stay at the newest message unless the reader has scrolled up to older ones.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setError("");
    const temp: Pending = { id: `tmp-${Date.now()}`, fromMe: true, body, at: Date.now(), readAt: null, expiresAt: null, pending: true };
    atBottom.current = true;
    setMessages((cur) => [...cur, temp]);
    setText("");
    try {
      const r = await fetch(`/api/messages/${encodeURIComponent(friendId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const d = (await r.json().catch(() => ({}))) as { message?: Message; error?: string };
      if (!r.ok || !d.message) throw new Error(d.error ?? "Your message was not sent. Try again.");
      setMessages((cur) => cur.map((m) => (m.id === temp.id ? d.message! : m)));
      reloadThreads();
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      setText(body);
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.");
    }
    box.current?.focus();
  }

  // Grow the box with its text, up to about five lines.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  if (!friend) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="m-0 text-[17px] font-semibold">You are no longer friends</p>
        <Link href="/friends" className="text-[15px] text-link">Back to Friends</Link>
      </div>
    );
  }

  const online = friend.lastSeen !== null && now - friend.lastSeen < ONLINE_MS;
  const lastMine = messages.findLast((m) => m.fromMe && !m.pending);
  const sent = (m: Pending) => m === lastMine;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b-[0.5px] border-edge/15 bg-surface/80 px-4 py-2.5 backdrop-blur-xl">
        <Avatar f={friend} size={38} online={online} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="truncate text-[16px] font-semibold">{friend.name}</span>
            <StreakTag streak={friend.streak} today={friend.today} />
          </span>
          <span className={`truncate text-[12px] ${online ? "font-medium text-green" : "text-muted"}`}>{seenLabel(friend.lastSeen, now)}</span>
        </span>
      </header>

      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-6">
        <p className="mx-auto mb-4 mt-0 flex max-w-[320px] items-center justify-center gap-1.5 text-center text-[12px] text-muted">
          <Icon name="lock" size={11} />Messages are deleted 30 days after they are read.
        </p>
        {!messages.length && <p className="m-0 mt-10 text-center text-[15px] text-muted">Say hello to {friend.name.split(" ")[0]}.</p>}
        <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || dayOf(prev.at) !== dayOf(m.at);
            const tail = !next || next.fromMe !== m.fromMe || dayOf(next.at) !== dayOf(m.at) || next.at - m.at > 5 * 60_000;
            return (
              <li key={m.id} className="flex flex-col">
                {newDay && <span className="my-3 text-center text-[12px] font-medium text-muted">{dayLabel(m.at, now)}</span>}
                <div className={`flex ${m.fromMe ? "justify-end" : "justify-start"} ${tail ? "mb-1.5" : ""}`}>
                  <p title={clock(m.at)} className={`m-0 max-w-[78%] whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-[16px] leading-snug md:max-w-[65%] ${
                    m.fromMe ? `bg-blue text-white ${tail ? "rounded-br-[6px]" : ""} ${m.pending ? "opacity-60" : ""}` : `bg-surface text-ink shadow-card ${tail ? "rounded-bl-[6px]" : ""}`}`}>{m.body}</p>
                </div>
                {sent(m) && <span className="-mt-1 mb-1 pr-1 text-right text-[11px] text-muted">{seen !== null && seen >= m.at ? "Seen" : "Delivered"}</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex shrink-0 flex-col gap-1 border-t-[0.5px] border-edge/15 bg-surface/80 px-3 py-2 backdrop-blur-xl md:px-6">
        {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">Message {friend.name}</label>
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
