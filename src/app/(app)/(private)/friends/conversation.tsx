"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useCalls } from "@/components/calls";
import { useFriends } from "@/components/friends";
import { ReportSheet, type ReportTarget } from "@/components/report";
import { Sheet } from "@/components/sheet";
import { MESSAGE_RULE, ONLINE_MS, seenLabel, type FriendLists, type Message } from "@/lib/friend-view";
import type { Plan } from "@/lib/data";
import { ChatView, HeaderButton, InfoIcon, PhoneIcon, type ChatMessage } from "./chat";
import { StreakTag, useFriendsShell } from "./friends-shell";

/** How often an open conversation checks for new messages while the page is visible; faster while the friend types. */
const POLL_MS = 4_000;
const TYPING_POLL_MS = 2_000;

type Other = { id: string; name: string; avatar: string | null; plan?: Plan };

/**
 * A conversation with one friend: messages, polled while open, voice calls, report and block. After the friendship
 * ends it stays readable (no replies, calls, typing or read receipts), so either person can still report from it.
 */
export function Conversation({ friendId, initial, initialSeen, other }: { friendId: string; initial: Message[]; initialSeen: number | null; other: Other }) {
  const router = useRouter();
  const { lists, setLists, reload, now, setBlocked } = useFriendsShell();
  const { refresh } = useFriends();
  const { start } = useCalls();
  const friend = lists.friends.find((f) => f.id === friendId);
  const who = friend ?? other;
  const first = who.name.split(" ")[0];
  const [messages, setMessages] = useState<(Message & { pending?: boolean })[]>(initial);
  const [seen, setSeen] = useState(initialSeen);
  const [typing, setTyping] = useState(false);
  const [options, setOptions] = useState(false);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [confirm, setConfirm] = useState<"block" | "remove" | null>(null);

  // Opening the conversation read the friend's messages on the server: update the list and the badge.
  useEffect(() => { reload(); refresh(); }, [reload, refresh]);

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const last = messages.findLast((m) => !m.pending)?.at ?? 0;
    try {
      const r = await fetch(`/api/messages/${encodeURIComponent(friendId)}${last ? `?after=${last}` : ""}`);
      if (!r.ok) return;
      const d = (await r.json()) as { messages: Message[]; seen: number | null; typing: boolean; canReply?: boolean };
      setSeen(d.seen);
      setTyping(d.typing);
      if (d.canReply === false) setTyping(false);
      if (!d.messages.length) return;
      setMessages((cur) => {
        const ids = new Set(cur.map((m) => m.id));
        const fresh = d.messages.filter((m) => !ids.has(m.id));
        return fresh.length ? [...cur, ...fresh] : cur;
      });
      if (d.messages.some((m) => !m.fromMe)) { reload(); refresh(); }
    } catch {}
  }, [friendId, messages, reload, refresh]);

  useEffect(() => {
    const t = setInterval(poll, typing ? TYPING_POLL_MS : POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", poll); };
  }, [poll, typing]);

  const onTyping = useCallback((on: boolean) => {
    void fetch("/api/typing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ friendId, on }), keepalive: true }).catch(() => {});
  }, [friendId]);

  async function send(body: string) {
    const temp = { id: `tmp-${Date.now()}`, fromMe: true, body, at: Date.now(), readAt: null, expiresAt: null, pending: true };
    setMessages((cur) => [...cur, temp]);
    try {
      const r = await fetch(`/api/messages/${encodeURIComponent(friendId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const d = (await r.json().catch(() => ({}))) as { message?: Message; error?: string };
      if (!r.ok || !d.message) throw new Error(d.error ?? "Your message was not sent. Try again.");
      setMessages((cur) => cur.map((m) => (m.id === temp.id ? d.message! : m)));
      reload();
      return null;
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      return e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.";
    }
  }

  async function blockOrRemove(what: "block" | "remove") {
    if (what === "block") {
      const r = await fetch("/api/blocks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: friendId, on: true }) }).catch(() => null);
      if (r?.ok) setBlocked(((await r.json()) as { blocked: { id: string; name: string; avatar: string | null }[] }).blocked);
    } else await fetch(`/api/friends/${encodeURIComponent(friendId)}`, { method: "DELETE" }).catch(() => null);
    const l = (await fetch("/api/friends").then((r) => r.json()).catch(() => null)) as FriendLists | null;
    if (l) setLists(l);
    router.push("/friends");
  }

  const online = !!friend && friend.lastSeen !== null && now - friend.lastSeen < ONLINE_MS;
  const header = (
    <header className="flex shrink-0 items-center gap-3 border-b-[0.5px] border-edge/15 bg-surface/80 px-4 py-2.5 backdrop-blur-xl">
      <Avatar id={who.id} name={who.name} src={who.avatar} plan={who.plan} size={38} online={online} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="truncate text-[16px] font-semibold">{who.name}</span>
          {friend && <StreakTag streak={friend.streak} today={friend.today} />}
        </span>
        <span className={`truncate text-[12px] ${typing || online ? "font-medium text-green" : "text-muted"}`}>{!friend ? "Not friends" : typing ? "typing…" : seenLabel(friend.lastSeen, now)}</span>
      </span>
      {friend && <HeaderButton label="Voice call" onClick={() => start({ friendId }, friend.name)}><PhoneIcon /></HeaderButton>}
      <HeaderButton label="More" onClick={() => setOptions(true)}><InfoIcon /></HeaderButton>
    </header>
  );

  return (
    <>
      <ChatView header={header} messages={messages as ChatMessage[]} rule={MESSAGE_RULE} now={now} empty={friend ? `Say hello to ${first}.` : "No messages left in this conversation."}
        typers={friend && typing ? [{ id: friend.id, name: friend.name, avatar: friend.avatar }] : []} onTyping={friend ? onTyping : undefined}
        closed="You can't reply to this conversation. Messages stay until they expire, and you can still report them."
        status={(m) => {
          if (seen !== null && seen >= m.at) return "Seen";
          const exp = messages.find((x) => x.id === m.id)?.expiresAt;
          return `Delivered${exp ? ` · deleted ${new Date(exp).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} if unread` : ""}`;
        }}
        onSend={friend ? send : undefined} onReport={(m) => setReporting({ kind: "message", target: m.id, what: "message" })} />

      {options && (
        <Sheet label={who.name} onClose={() => { setOptions(false); setConfirm(null); }}>
          <div className="flex flex-col items-center gap-2 px-4 pb-2 pt-4 text-center">
            <Avatar id={who.id} name={who.name} src={who.avatar} plan={who.plan} size={72} />
            <h2 className="m-0 text-[20px] font-semibold">{who.name}</h2>
            {friend?.school && <p className="m-0 text-[14px] text-muted">{friend.school}</p>}
          </div>
          <div className="flex flex-col gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex flex-col overflow-hidden rounded-[16px] bg-surface shadow-card">
              <SheetRow onClick={() => { setOptions(false); setReporting({ kind: "user", target: who.id, what: "person" }); }}>Report {first}</SheetRow>
              {friend && <SheetRow danger onClick={() => (confirm === "remove" ? void blockOrRemove("remove") : setConfirm("remove"))}>{confirm === "remove" ? "Tap again to remove friend" : "Remove friend"}</SheetRow>}
              <SheetRow danger onClick={() => (confirm === "block" ? void blockOrRemove("block") : setConfirm("block"))}>{confirm === "block" ? `Tap again to block ${first}` : "Block"}</SheetRow>
            </div>
            <p className="m-0 px-1 text-[12px] text-muted">Blocking also removes them as a friend. Your messages stay, read-only, so you can still report them. They are not told.</p>
          </div>
        </Sheet>
      )}
      {reporting && <ReportSheet item={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}

export function SheetRow({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-12 border-0 border-t border-edge/[0.06] bg-transparent px-4 text-left text-[16px] first:border-t-0 ${danger ? "text-red" : "text-link"}`}>{children}</button>
  );
}
