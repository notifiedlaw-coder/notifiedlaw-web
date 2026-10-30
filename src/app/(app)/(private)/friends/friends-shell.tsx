"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { friendsCall, useFriends } from "@/components/friends";
import { Icon } from "@/components/icons";
import { ONLINE_MS, hueOf, seenLabel, shortTime, type Friend, type FriendLists, type Thread } from "@/lib/friend-view";

type Streak = { streak: number; best: number };
type Ctx = { lists: FriendLists; threads: Thread[]; reloadThreads: () => void; now: number };
const ShellCtx = createContext<Ctx | null>(null);
export const useFriendsShell = () => useContext(ShellCtx)!;

/** How often the list refreshes its conversations while the page is visible. */
const THREADS_MS = 8_000;

/** The Friends page frame: the list of friends on the left (the whole screen on phones), the conversation beside it. */
export function FriendsShell({ initialLists, initialThreads, streak, children }: { initialLists: FriendLists; initialThreads: Thread[]; streak: Streak; children: React.ReactNode }) {
  const path = usePathname();
  const selected = path.split("/")[2] ?? null;
  const { incoming, mine, refresh } = useFriends();
  const [lists, setLists] = useState(initialLists);
  const [threads, setThreads] = useState(initialThreads);
  const [now, setNow] = useState(() => Date.now());

  const reloadThreads = useCallback(() => {
    fetch("/api/messages").then((r) => (r.ok ? (r.json() as Promise<{ threads: Thread[] }>) : null)).then((d) => d && setThreads(d.threads)).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      reloadThreads();
    };
    const t = setInterval(tick, THREADS_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [reloadThreads]);

  // A new request reported by the heartbeat: fetch the lists so it shows.
  useEffect(() => {
    if (incoming === lists.incoming.length) return;
    friendsCall("GET", "/api/friends").then((r) => typeof r !== "string" && setLists(r));
  }, [incoming, lists.incoming.length]);

  const ctx = useMemo(() => ({ lists, threads, reloadThreads, now }), [lists, threads, reloadThreads, now]);
  return (
    <ShellCtx.Provider value={ctx}>
      <div className="flex h-full min-h-0">
        <aside aria-label="Friends" className={`${selected ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-edge/10 bg-canvas md:w-[360px] md:border-r lg:w-[400px]`}>
          <FriendsList lists={lists} setLists={(l) => { setLists(l); refresh(); }} threads={threads} selected={selected} streak={mine ?? streak} now={now} />
        </aside>
        <section aria-label="Conversation" className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-canvas`}>{children}</section>
      </div>
    </ShellCtx.Provider>
  );
}

// ---- The list --------------------------------------------------------------------------------------------------------

const label = "m-0 px-1 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted";
const group = "m-0 flex list-none flex-col overflow-hidden rounded-[16px] bg-surface p-0 shadow-card";

function FriendsList({ lists, setLists, threads, selected, streak, now }: { lists: FriendLists; setLists: (l: FriendLists) => void; threads: Thread[]; selected: string | null; streak: Streak; now: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function act(id: string, method: "POST" | "DELETE") {
    setBusy(id);
    setError("");
    const r = await friendsCall(method, `/api/friends/${encodeURIComponent(id)}`);
    setBusy(null);
    if (typeof r === "string") return setError(r);
    setLists(r);
    if (method === "DELETE" && id === selected) router.push("/friends");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setNote(null);
    const was = lists.friends.length;
    const r = await friendsCall("POST", "/api/friends", { email: email.trim() });
    setSending(false);
    if (typeof r === "string") return setNote({ ok: false, text: r });
    setLists(r);
    setEmail("");
    setNote({ ok: true, text: r.friends.length > was ? "They had already asked, so you are now friends." : "Request sent. They will see it on their Friends page." });
  }

  // Conversations with the newest message first, then friends without messages by when they were last in.
  const byId = useMemo(() => new Map(threads.map((t) => [t.friendId, t])), [threads]);
  const friends = useMemo(() => [...lists.friends].sort((a, b) =>
    (byId.get(b.id)?.last.at ?? 0) - (byId.get(a.id)?.last.at ?? 0) || (b.lastSeen ?? 0) - (a.lastSeen ?? 0)), [lists.friends, byId]);
  const online = friends.filter((f) => f.lastSeen !== null && now - f.lastSeen < ONLINE_MS).length;

  return (
    <div className="flex flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 md:pt-6">
      <div className="hidden items-baseline justify-between px-1 md:flex">
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.03em]">Friends</h1>
      </div>
      <h1 className="sr-only md:hidden">Friends</h1>

      <div className="flex items-center gap-3 rounded-[16px] bg-surface px-4 py-3 shadow-card">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${streak.streak ? "bg-[#FF9500]/15 text-[#FF9500]" : "bg-fill text-faint"}`}><Icon name="flame" size={20} /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold">{streak.streak ? `${streak.streak}-day streak` : "Start a streak today"}</span>
          <span className="text-[12px] text-muted">{streak.best > 1 ? `Your best is ${streak.best} days. ` : ""}Open Notified Law each day to keep it going.</span>
        </span>
      </div>

      {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}

      {lists.incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={label}>Friend requests</h2>
          <ul className={group}>
            {lists.incoming.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                <Avatar f={f} size={40} />
                <Who name={f.name} sub={f.school ?? "Wants to be friends"} />
                <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="h-8 shrink-0 rounded-full border-0 bg-fill px-3.5 text-[14px] font-semibold text-ink disabled:opacity-50">Decline</button>
                <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "POST")} className="h-8 shrink-0 rounded-full border-0 bg-blue px-3.5 text-[14px] font-semibold text-white disabled:opacity-50">Accept</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className={label.replace("px-1 ", "")}>Messages</h2>
          <span className="flex items-baseline gap-3">
            {online > 0 && <span className="text-[13px] font-medium text-green">{online} online</span>}
            {friends.length > 0 && <button type="button" onClick={() => setEditing(!editing)} className="border-0 bg-transparent p-0 text-[15px] text-link">{editing ? "Done" : "Edit"}</button>}
          </span>
        </div>
        {friends.length ? (
          <ul className={group}>
            {friends.map((f) => {
              const t = byId.get(f.id);
              const on = f.lastSeen !== null && now - f.lastSeen < ONLINE_MS;
              const body = (
                <>
                  <Avatar f={f} size={44} online={on} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[15px] ${t?.unread ? "font-bold" : "font-semibold"}`}>{f.name}</span>
                      {!editing && t && <span className={`shrink-0 text-[12px] tabular-nums ${t.unread ? "font-semibold text-blue" : "text-muted"}`}>{shortTime(t.last.at, now)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[13px] ${t?.unread ? "font-medium text-ink" : on && !t ? "font-medium text-green" : "text-muted"}`}>
                        {t ? `${t.last.fromMe ? "You: " : ""}${t.last.body}` : seenLabel(f.lastSeen, now)}
                      </span>
                      {!editing && (t?.unread
                        ? <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-blue px-1.5 text-[12px] font-semibold text-white">{t.unread}</span>
                        : <StreakTag streak={f.streak} today={f.today} />)}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={f.id} className="border-t border-edge/[0.06] first:border-0">
                  {editing ? (
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      {body}
                      <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="h-8 shrink-0 rounded-full border-0 bg-red px-3.5 text-[14px] font-semibold text-white disabled:opacity-50">Remove</button>
                    </div>
                  ) : (
                    <Link href={`/friends/${f.id}`} aria-current={f.id === selected ? "page" : undefined}
                      className={`flex items-center gap-3 px-4 py-2.5 active:bg-fill ${f.id === selected ? "bg-blue/[0.08]" : "hover:bg-edge/[0.03]"}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="m-0 rounded-[16px] bg-surface px-4 py-3 text-[15px] text-muted shadow-card">No friends yet. Add one below to message them, see when they study and follow their streak.</p>
        )}
        {editing && <p className="m-0 px-1 text-[12px] text-muted">Removing a friend also deletes your messages with them.</p>}
      </section>

      <form onSubmit={send} className="flex flex-col gap-2">
        <label htmlFor="friend-email" className={label}>Add a friend</label>
        <div className="flex gap-2">
          <input id="friend-email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => { setEmail(e.target.value); setNote(null); }}
            placeholder="Their email address" className="h-11 min-w-0 flex-1 rounded-[12px] border-0 bg-surface px-3.5 text-[16px] text-ink shadow-card outline-none placeholder:text-faint focus:ring-2 focus:ring-blue/40" />
          <button type="submit" disabled={!email.trim() || sending} className="h-11 shrink-0 rounded-[12px] border-0 bg-blue px-5 text-[16px] font-semibold text-white disabled:opacity-40">{sending ? "Sending" : "Send"}</button>
        </div>
        {note ? <p role={note.ok ? "status" : "alert"} className={`m-0 px-1 text-[13px] ${note.ok ? "text-green" : "text-red"}`}>{note.text}</p>
          : <p className="m-0 px-1 text-[13px] text-muted">Use the email they signed up to Notified Law with.</p>}
      </form>

      {lists.outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={label}>Sent</h2>
          <ul className={group}>
            {lists.outgoing.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                <Avatar f={f} size={36} />
                <Who name={f.name} sub="Waiting for them to accept" />
                <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="shrink-0 border-0 bg-transparent text-[15px] text-link disabled:opacity-50">Cancel</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ---- Small pieces ----------------------------------------------------------------------------------------------------

const Who = ({ name, sub }: { name: string; sub: string }) => (
  <span className="flex min-w-0 flex-1 flex-col">
    <span className="truncate text-[15px] font-medium">{name}</span>
    <span className="truncate text-[12px] text-muted">{sub}</span>
  </span>
);

export function Avatar({ f, size, online }: { f: Pick<Friend, "id" | "name">; size: number; online?: boolean }) {
  const initials = f.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const hue = hueOf(f.id);
  return (
    <span aria-hidden className="relative shrink-0">
      <span className="grid place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(145deg, hsl(${hue} 70% 58%), hsl(${(hue + 35) % 360} 65% 46%))` }}>{initials}</span>
      {online && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green ring-2 ring-surface" />}
    </span>
  );
}

/** Streak with a flame: orange once today counts, grey while it still needs today to carry on. */
export function StreakTag({ streak, today }: { streak: number; today: boolean }) {
  if (!streak) return null;
  return (
    <span className={`flex shrink-0 items-center gap-0.5 text-[13px] font-semibold tabular-nums ${today ? "text-[#FF9500]" : "text-faint"}`} aria-label={`${streak}-day streak${today ? "" : ", not yet active today"}`}>
      <Icon name="flame" size={13} />{streak}
    </span>
  );
}
