"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { HEARTBEAT_MS, ONLINE_MS, hueOf, seenLabel, type Friend, type FriendLists } from "@/lib/friend-view";
import { Icon } from "./icons";
import { Sheet } from "./sheet";

type Ctx = {
  /** The lists once the Friends sheet has loaded them; null before. */
  lists: FriendLists | null;
  setLists: (l: FriendLists) => void;
  /** Friend requests waiting on the user, for the badge. */
  incoming: number;
  /** Opens Friend activity. */
  open: () => void;
};
const FriendsCtx = createContext<Ctx>({ lists: null, setLists: () => {}, incoming: 0, open: () => {} });
export const useFriends = () => useContext(FriendsCtx);

/** Sends a friends API call; the updated lists, or the error message to show. */
export async function friendsCall(method: string, url: string, body?: unknown): Promise<FriendLists | string> {
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json().catch(() => ({}))) as FriendLists & { error?: string };
    return res.ok ? data : data.error ?? "Something went wrong. Try again.";
  } catch {
    return "You seem to be offline. Try again.";
  }
}

type Streak = { streak: number; best: number };

/**
 * For signed-in users: sends the activity heartbeat (last seen, daily streak) while the app is open and visible,
 * keeps the friend lists and the request count, and shows the Friend activity sheet.
 */
export function FriendsProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [lists, setListsState] = useState<FriendLists | null>(null);
  const [incoming, setIncoming] = useState(0);
  const [mine, setMine] = useState<Streak | null>(null);
  const [shown, setShown] = useState(false);
  const setLists = useCallback((l: FriendLists) => { setListsState(l); setIncoming(l.incoming.length); }, []);
  const open = useCallback(() => setShown(true), []);
  const close = useCallback(() => setShown(false), []);

  useEffect(() => {
    if (!enabled) return;
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/activity", { method: "POST" })
        .then((r) => (r.ok ? (r.json() as Promise<{ incoming: number } & Streak>) : null))
        .then((d) => {
          if (!d) return;
          setIncoming(d.incoming);
          setMine({ streak: d.streak, best: d.best });
        })
        .catch(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", beat); };
  }, [enabled]);

  const value = useMemo(() => ({ lists, setLists, incoming, open }), [lists, setLists, incoming, open]);
  return (
    <FriendsCtx.Provider value={value}>
      {children}
      {enabled && shown && <FriendsSheet mine={mine} onClose={close} />}
    </FriendsCtx.Provider>
  );
}

/** The friends button beside the profile name: opens Friend activity, badged with requests waiting. */
export function FriendsButton({ size = 32 }: { size?: number }) {
  const { incoming, open } = useFriends();
  return (
    <button type="button" onClick={open} title="Friends" aria-label={incoming ? `Friends, ${incoming} ${incoming === 1 ? "request" : "requests"} waiting` : "Friends"}
      className="relative grid shrink-0 place-items-center rounded-full border-0 bg-edge/[0.06] text-ink hover:bg-edge/[0.1] active:opacity-60" style={{ width: size, height: size }}>
      <Icon name="friends" size={Math.round(size * 0.53)} />
      {incoming > 0 && <span aria-hidden className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] font-semibold leading-none text-white">{incoming > 9 ? "9+" : incoming}</span>}
    </button>
  );
}

const label = "m-0 px-1 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted";
const group = "m-0 flex list-none flex-col overflow-hidden rounded-[16px] bg-surface p-0 shadow-card";

function Avatar({ f, size, online }: { f: Friend; size: number; online?: boolean }) {
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
function StreakTag({ streak, today }: { streak: number; today: boolean }) {
  if (!streak) return <span className="shrink-0 text-[13px] text-faint">No streak</span>;
  return (
    <span className={`flex shrink-0 items-center gap-1 text-[15px] font-semibold tabular-nums ${today ? "text-[#FF9500]" : "text-muted"}`} aria-label={`${streak}-day streak${today ? "" : ", not yet active today"}`}>
      <Icon name="flame" size={15} />{streak}
    </span>
  );
}

/** Friend activity: who is online, when friends were last in, their streaks; plus requests, adding and removing friends. */
function FriendsSheet({ mine, onClose }: { mine: Streak | null; onClose: () => void }) {
  const { lists, setLists } = useFriends();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Fresh lists each time the sheet opens, and the "x min ago" labels kept current while it stays open.
  useEffect(() => {
    let live = true;
    friendsCall("GET", "/api/friends").then((r) => { if (!live) return; if (typeof r === "string") setError(r); else setLists(r); });
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => { live = false; clearInterval(t); };
  }, [setLists]);

  async function act(id: string, method: "POST" | "DELETE") {
    setBusy(id);
    setError("");
    const r = await friendsCall(method, `/api/friends/${encodeURIComponent(id)}`);
    setBusy(null);
    if (typeof r === "string") setError(r);
    else setLists(r);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setNote(null);
    const was = lists?.friends.length ?? 0;
    const r = await friendsCall("POST", "/api/friends", { email: email.trim() });
    setSending(false);
    if (typeof r === "string") return setNote({ ok: false, text: r });
    setLists(r);
    setEmail("");
    setNote({ ok: true, text: r.friends.length > was ? "They had already asked, so you are now friends." : "Request sent. They will see it under the friends button." });
  }

  const friends = useMemo(() => [...(lists?.friends ?? [])].sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0)), [lists]);
  const online = friends.filter((f) => f.lastSeen !== null && now - f.lastSeen < ONLINE_MS).length;

  const who = (f: Friend, sub: string, extra?: string) => (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[15px] font-medium">{f.name}</span>
      <span className={`truncate text-[12px] ${extra ?? "text-muted"}`}>{sub}</span>
    </span>
  );

  return (
    <Sheet label="Friend activity" onClose={onClose}>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
        {friends.length ? <button type="button" onClick={() => setEditing(!editing)} className="justify-self-start border-0 bg-transparent text-[17px] text-link">{editing ? "Cancel" : "Edit"}</button> : <span />}
        <h2 className="m-0 text-[17px] font-semibold">Friends</h2>
        <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button>
      </div>

      <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {mine && (
          <div className="flex items-center gap-3 rounded-[16px] bg-surface px-4 py-3 shadow-card">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${mine.streak ? "bg-[#FF9500]/15 text-[#FF9500]" : "bg-fill text-faint"}`}><Icon name="flame" size={20} /></span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold">{mine.streak ? `${mine.streak}-day streak` : "Start a streak today"}</span>
              <span className="text-[12px] text-muted">{mine.best > 1 ? `Your best is ${mine.best} days. ` : ""}Open Notified Law each day to keep it going.</span>
            </span>
          </div>
        )}

        {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}

        {lists && lists.incoming.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className={label}>Friend requests</h3>
            <ul className={group}>
              {lists.incoming.map((f) => (
                <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                  <Avatar f={f} size={40} />
                  {who(f, f.school ?? "Wants to be friends")}
                  <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="h-8 shrink-0 rounded-full border-0 bg-fill px-3.5 text-[14px] font-semibold text-ink disabled:opacity-50">Decline</button>
                  <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "POST")} className="h-8 shrink-0 rounded-full border-0 bg-blue px-3.5 text-[14px] font-semibold text-white disabled:opacity-50">Accept</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h3 className={label}>Activity</h3>
            {online > 0 && <span className="px-1 text-[13px] font-medium text-green">{online} online</span>}
          </div>
          {!lists ? (
            <p className="m-0 rounded-[16px] bg-surface px-4 py-3 text-[15px] text-muted shadow-card">Loading…</p>
          ) : friends.length ? (
            <ul className={group}>
              {friends.map((f) => {
                const on = f.lastSeen !== null && now - f.lastSeen < ONLINE_MS;
                return (
                  <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                    <Avatar f={f} size={40} online={on} />
                    {who(f, seenLabel(f.lastSeen, now), on ? "font-medium text-green" : undefined)}
                    {editing
                      ? <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="h-8 shrink-0 rounded-full border-0 bg-red px-3.5 text-[14px] font-semibold text-white disabled:opacity-50">Remove</button>
                      : <StreakTag streak={f.streak} today={f.today} />}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="m-0 rounded-[16px] bg-surface px-4 py-3 text-[15px] text-muted shadow-card">No friends yet. Add one below to see when they study and how long their streak is.</p>
          )}
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

        {lists && lists.outgoing.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className={label}>Sent</h3>
            <ul className={group}>
              {lists.outgoing.map((f) => (
                <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                  <Avatar f={f} size={36} />
                  {who(f, "Waiting for them to accept")}
                  <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="shrink-0 border-0 bg-transparent text-[15px] text-link disabled:opacity-50">Cancel</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Sheet>
  );
}
