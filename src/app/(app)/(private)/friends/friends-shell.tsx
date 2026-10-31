"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { friendsCall, useFriends } from "@/components/friends";
import { Icon } from "@/components/icons";
import { usePlan } from "@/components/plan";
import { Sheet } from "@/components/sheet";
import { MAX_GROUP_MEMBERS, MAX_GROUP_NAME, MAX_OWNED_GROUPS, MESSAGE_RULE, GROUP_MESSAGE_RULE, ONLINE_MS, seenLabel, shortTime, type FriendLists, type GroupSummary, type Thread } from "@/lib/friend-view";
import { InfoIcon } from "./chat";

type Streak = { streak: number; best: number };
type Me = { id: string; name: string; avatar: string | null };
type Blocked = { id: string; name: string; avatar: string | null };
type Ctx = {
  me: Me; lists: FriendLists; threads: Thread[]; groups: GroupSummary[]; now: number;
  /** Friends typing to the user, and groups where someone is typing, as of the last refresh. */
  typing: { friends: string[]; groups: string[] };
  setLists: (l: FriendLists) => void;
  /** Refreshes conversations and groups now, after something changed them. */
  reload: () => void;
  setBlocked: (b: Blocked[]) => void;
};
const ShellCtx = createContext<Ctx | null>(null);
export const useFriendsShell = () => useContext(ShellCtx)!;

/** How often the list refreshes its conversations and groups while the page is visible. */
const LIST_MS = 8_000;
/** The Friends page frame: friends and groups on the left (the whole screen on phones), the conversation beside them. */
export function FriendsShell({ me, initialLists, initialThreads, initialGroups, initialBlocked, streak, children }: {
  me: Me; initialLists: FriendLists; initialThreads: Thread[]; initialGroups: GroupSummary[]; initialBlocked: Blocked[]; streak: Streak; children: React.ReactNode;
}) {
  const path = usePathname();
  const parts = path.split("/");
  const selected = parts[2] === "group" ? `g:${parts[3] ?? ""}` : parts[2] ? `f:${parts[2]}` : null;
  const { incoming, refresh } = useFriends();
  const [lists, setListsState] = useState(initialLists);
  const [threads, setThreads] = useState(initialThreads);
  const [typing, setTyping] = useState<Ctx["typing"]>({ friends: [], groups: [] });
  const [groups, setGroups] = useState(initialGroups);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [now, setNow] = useState(() => Date.now());

  // Friends too, so a request accepted on someone else's phone (and who is online) shows within seconds.
  const reload = useCallback(() => {
    const get = <T,>(url: string) => fetch(url).then((r) => (r.ok ? (r.json() as Promise<T>) : null)).catch(() => null);
    void get<FriendLists>("/api/friends").then((d) => d && setListsState(d));
    void get<{ threads: Thread[]; typing: Ctx["typing"] }>("/api/messages").then((d) => { if (d) { setThreads(d.threads); setTyping(d.typing); } });
    void get<{ groups: GroupSummary[] }>("/api/groups").then((d) => d && setGroups(d.groups));
  }, []);
  const setLists = useCallback((l: FriendLists) => { setListsState(l); refresh(); }, [refresh]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      reload();
    };
    const t = setInterval(tick, LIST_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [reload]);

  // A new request reported by the heartbeat: fetch the lists so it shows.
  useEffect(() => {
    if (incoming === lists.incoming.length) return;
    friendsCall("GET", "/api/friends").then((r) => typeof r !== "string" && setListsState(r));
  }, [incoming, lists.incoming.length]);

  const ctx = useMemo(() => ({ me, lists, threads, groups, now, typing, setLists, reload, setBlocked }), [me, lists, threads, groups, now, typing, setLists, reload]);
  return (
    <ShellCtx.Provider value={ctx}>
      <div className="flex h-full min-h-0">
        <aside aria-label="Friends" className={`${selected ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-edge/10 bg-canvas md:w-[340px] md:border-r lg:w-[380px]`}>
          <FriendsList selected={selected} streak={streak} blocked={blocked} />
        </aside>
        <section aria-label="Conversation" className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-canvas`}>{children}</section>
      </div>
    </ShellCtx.Provider>
  );
}

// ---- The list --------------------------------------------------------------------------------------------------------

const label = "m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-faint";
const group = "m-0 flex list-none flex-col overflow-hidden rounded-[18px] border border-edge/10 bg-surface p-0";
const rowLink = "flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-fill";

function FriendsList({ selected, streak: initialStreak, blocked }: { selected: string | null; streak: Streak; blocked: Blocked[] }) {
  const router = useRouter();
  const { me, lists, setLists, threads, groups, now, typing, reload, setBlocked } = useFriendsShell();
  const { mine } = useFriends();
  const { plan: myPlan } = usePlan();
  const streak = mine ?? initialStreak;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [newGroup, setNewGroup] = useState(false);
  const [adding, setAdding] = useState(false);
  const [about, setAbout] = useState(false);

  async function act(id: string, method: "POST" | "DELETE") {
    setBusy(id);
    setError("");
    const r = await friendsCall(method, `/api/friends/${encodeURIComponent(id)}`);
    setBusy(null);
    if (typeof r === "string") return setError(r);
    setLists(r);
    if (method === "DELETE" && selected === `f:${id}`) router.push("/friends");
  }

  async function unblock(id: string) {
    setBusy(id);
    const r = await fetch("/api/blocks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: id, on: false }) }).catch(() => null);
    setBusy(null);
    const d = r?.ok ? ((await r.json()) as { blocked: Blocked[] }) : null;
    if (d) setBlocked(d.blocked);
    else setError("Could not unblock. Try again.");
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
    setNote({ ok: true, text: r.friends.length > was ? "They had already asked, so you are now friends." : "Request sent." });
  }

  // Conversations with the newest message first, then friends without messages by when they were last in.
  const byId = useMemo(() => new Map(threads.map((t) => [t.friendId, t])), [threads]);
  const friends = useMemo(() => [...lists.friends].sort((a, b) =>
    (byId.get(b.id)?.last.at ?? 0) - (byId.get(a.id)?.last.at ?? 0) || (b.lastSeen ?? 0) - (a.lastSeen ?? 0)), [lists.friends, byId]);
  // Conversations that outlived the friendship: read-only until they expire, still there to report from.
  const past = useMemo(() => {
    const ids = new Set(lists.friends.map((f) => f.id));
    return threads.filter((t) => !ids.has(t.friendId)).sort((a, b) => b.last.at - a.last.at);
  }, [threads, lists.friends]);
  const online = friends.filter((f) => f.lastSeen !== null && now - f.lastSeen < ONLINE_MS).length;
  const owned = groups.filter((g) => g.admin).length;

  return (
    <div className="flex flex-col gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 md:pt-6">
      <div className="-mb-2 flex items-center gap-2 px-1">
        <h1 className="sr-only">Friends</h1>
        <span className="flex-1" />
        <RoundButton label="About Friends" onClick={() => setAbout(true)}><InfoIcon /></RoundButton>
        <RoundButton label="Add a friend" onClick={() => { setNote(null); setAdding(true); }}><AddFriendIcon /></RoundButton>
      </div>

      {/* You: picture and streak. The picture and profile are changed on the Profile page. */}
      <Link href="/settings" className="flex items-center gap-3 rounded-[18px] border border-edge/10 bg-surface px-4 py-3 active:bg-fill" style={{ textDecoration: "none", color: "inherit" }}>
        <Avatar id={me.id} name={me.name} src={me.avatar} plan={myPlan} size={52} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[22px] leading-tight">{me.name}</span>
          <span className={`flex items-center gap-1 text-[13px] ${streak.streak ? "font-medium text-[#C4552B]" : "text-muted"}`}>
            <Icon name="flame" size={13} />{streak.streak ? `${streak.streak}-day streak${streak.best > streak.streak ? ` · best ${streak.best}` : ""}` : "No streak yet"}
          </span>
        </span>
        <Icon name="chevron" size={14} className="shrink-0 -rotate-90 text-faint" />
      </Link>

      {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}

      {lists.incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={`${label} px-1`}>Friend requests</h2>
          <ul className={group}>
            {lists.incoming.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                <Avatar id={f.id} name={f.name} src={f.avatar} plan={f.plan} size={40} />
                <Who name={f.name} sub={f.school ?? ""} />
                <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="h-10 shrink-0 rounded-full border border-edge/15 bg-transparent px-4 text-[15px] font-semibold text-ink disabled:opacity-50">Decline</button>
                <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "POST")} className="h-10 shrink-0 rounded-full border-0 bg-blue px-4 text-[15px] font-semibold text-white disabled:opacity-50">Accept</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className={label}>Groups</h2>
          {owned < MAX_OWNED_GROUPS && lists.friends.length > 0 && <button type="button" onClick={() => setNewGroup(true)} className="border-0 bg-transparent p-0 text-[15px] text-link">New group</button>}
        </div>
        {groups.length ? (
          <ul className={group}>
            {groups.map((g) => (
              <li key={g.id} className="border-t border-edge/[0.06] first:border-0">
                <Link href={`/friends/group/${g.id}`} aria-current={selected === `g:${g.id}` ? "page" : undefined}
                  className={`${rowLink} ${selected === `g:${g.id}` ? "bg-sidebar" : "hover:bg-hover"}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Avatar id={g.id} name={g.name} src={g.avatar} size={44} group />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[16px] ${g.unread ? "font-bold" : "font-semibold"}`}>{g.name}</span>
                      {g.last && <span className={`shrink-0 text-[12px] tabular-nums ${g.unread ? "font-semibold text-blue" : "text-muted"}`}>{shortTime(g.last.at, now)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[14px] ${g.unread ? "font-medium text-ink" : "text-muted"}`}>
                        {g.call ? <span className="font-medium text-green">Call in progress</span> : typing.groups.includes(g.id) ? <span className="font-medium text-green">typing…</span> : g.last ? `${g.last.fromMe ? "You" : g.last.from}: ${g.last.body}` : `${g.members} ${g.members === 1 ? "member" : "members"}`}
                      </span>
                      {g.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#E0683A] px-1.5 text-[12px] font-bold text-[#161A26]">{g.unread}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 rounded-[18px] border border-edge/10 bg-surface px-4 py-3.5 text-[16px] text-muted">No groups yet</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className={label}>Chats</h2>
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
                  <Avatar id={f.id} name={f.name} src={f.avatar} plan={f.plan} size={44} online={on} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[16px] ${t?.unread ? "font-bold" : "font-semibold"}`}>{f.name}</span>
                      {!editing && t && <span className={`shrink-0 text-[12px] tabular-nums ${t.unread ? "font-semibold text-blue" : "text-muted"}`}>{shortTime(t.last.at, now)}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[14px] ${t?.unread ? "font-medium text-ink" : on && !t ? "font-medium text-green" : "text-muted"}`}>
                        {typing.friends.includes(f.id) ? <span className="font-medium text-green">typing…</span> : t ? `${t.last.fromMe ? "You: " : ""}${t.last.body}` : seenLabel(f.lastSeen, now)}
                      </span>
                      {!editing && (t?.unread
                        ? <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#E0683A] px-1.5 text-[12px] font-bold text-[#161A26]">{t.unread}</span>
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
                      <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="h-10 shrink-0 rounded-full border-0 bg-plum px-4 text-[15px] font-semibold text-white disabled:opacity-50">Remove</button>
                    </div>
                  ) : (
                    <Link href={`/friends/${f.id}`} aria-current={selected === `f:${f.id}` ? "page" : undefined}
                      className={`${rowLink} ${selected === `f:${f.id}` ? "bg-sidebar" : "hover:bg-hover"}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {body}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-3 rounded-[18px] border border-edge/10 bg-surface px-4 py-3.5 text-left text-[16px] font-semibold text-link active:bg-fill">
            <AddFriendIcon />Add your first friend
          </button>
        )}
        {editing && <p className="m-0 px-1 text-[12px] text-muted">Your messages stay after removing a friend, read-only, until they expire.</p>}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={`${label} px-1`}>Past chats</h2>
          <ul className={group}>
            {past.map((t) => (
              <li key={t.friendId} className="border-t border-edge/[0.06] first:border-0">
                <Link href={`/friends/${t.friendId}`} aria-current={selected === `f:${t.friendId}` ? "page" : undefined}
                  className={`${rowLink} ${selected === `f:${t.friendId}` ? "bg-sidebar" : "hover:bg-hover"}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Avatar id={t.friendId} name={t.name} src={t.avatar} plan={t.plan} size={44} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[16px] ${t.unread ? "font-bold" : "font-semibold"}`}>{t.name}</span>
                      <span className={`shrink-0 text-[12px] tabular-nums ${t.unread ? "font-semibold text-blue" : "text-muted"}`}>{shortTime(t.last.at, now)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[14px] ${t.unread ? "font-medium text-ink" : "text-muted"}`}>{`${t.last.fromMe ? "You: " : ""}${t.last.body}`}</span>
                      {t.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#E0683A] px-1.5 text-[12px] font-bold text-[#161A26]">{t.unread}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lists.outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={`${label} px-1`}>Sent</h2>
          <ul className={group}>
            {lists.outgoing.map((f) => (
              <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                <Avatar id={f.id} name={f.name} src={f.avatar} plan={f.plan} size={36} />
                <Who name={f.name} sub="Pending" />
                <button type="button" disabled={busy === f.id} onClick={() => act(f.id, "DELETE")} className="shrink-0 border-0 bg-transparent text-[15px] text-link disabled:opacity-50">Cancel</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blocked.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={`${label} px-1`}>Blocked</h2>
          <ul className={group}>
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                <Avatar id={b.id} name={b.name} src={b.avatar} size={36} />
                <Who name={b.name} sub="" />
                <button type="button" disabled={busy === b.id} onClick={() => void unblock(b.id)} className="shrink-0 border-0 bg-transparent text-[15px] text-link disabled:opacity-50">Unblock</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adding && (
        <Sheet label="Add a friend" onClose={() => setAdding(false)}>
          <form onSubmit={send} className="flex flex-col gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2.5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
              <button type="button" onClick={() => setAdding(false)} className="justify-self-start border-0 bg-transparent text-[17px] text-link">Close</button>
              <h2 className="m-0 text-[17px] font-semibold">Add a friend</h2>
              <button type="submit" disabled={!email.trim() || sending} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link disabled:opacity-40">{sending ? "Sending" : "Send"}</button>
            </div>
            <label htmlFor="friend-email" className="sr-only">Their email address</label>
            <input id="friend-email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setNote(null); }}
              placeholder="Their Notified Law email" className="h-[52px] rounded-[12px] border border-edge/20 bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-blue/40" />
            {note && <p role={note.ok ? "status" : "alert"} className={`m-0 px-1 text-[13px] ${note.ok ? "text-green" : "text-red"}`}>{note.text}</p>}
          </form>
        </Sheet>
      )}
      {about && <AboutSheet owned={owned} onClose={() => setAbout(false)} />}
      {newGroup && <NewGroupSheet onClose={() => setNewGroup(false)} onCreated={(id) => { setNewGroup(false); reload(); router.push(`/friends/group/${id}`); }} />}
    </div>
  );
}

/** Name a group and pick friends for it. The creator is its only admin. */
function NewGroupSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { lists } = useFriendsShell();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const full = picked.size >= MAX_GROUP_MEMBERS - 1;
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, members: [...picked] }) });
      const d = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !d.id) throw new Error(d.error ?? "The group was not created. Try again.");
      onCreated(d.id);
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.");
      setBusy(false);
    }
  }
  return (
    <Sheet label="New group" onClose={onClose}>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
        <button type="button" onClick={onClose} className="justify-self-start border-0 bg-transparent text-[17px] text-link">Cancel</button>
        <h2 className="m-0 text-[17px] font-semibold">New group</h2>
        <button type="button" disabled={!name.trim() || busy} onClick={() => void create()} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link disabled:opacity-40">{busy ? "Creating" : "Create"}</button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_GROUP_NAME} placeholder="Group name" aria-label="Group name" autoFocus
          className="h-[52px] rounded-[12px] border border-edge/20 bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-blue/40" />
        {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}
        <div className="flex items-baseline justify-between px-1">
          <h3 className={label}>Add friends</h3>
          <span className="text-[13px] tabular-nums text-muted">{picked.size + 1} of {MAX_GROUP_MEMBERS}</span>
        </div>
        <ul className={group}>
          {lists.friends.map((f) => {
            const on = picked.has(f.id);
            return (
              <li key={f.id} className="border-t border-edge/[0.06] first:border-0">
                <button type="button" role="checkbox" aria-checked={on} disabled={!on && full}
                  onClick={() => setPicked((s) => { const n = new Set(s); if (on) n.delete(f.id); else n.add(f.id); return n; })}
                  className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left text-ink disabled:opacity-40">
                  <Avatar id={f.id} name={f.name} src={f.avatar} plan={f.plan} size={36} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{f.name}</span>
                  <Check on={on} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}

/** Everything the page used to say in footnotes, in one place: how chats, groups, calls, streaks and blocking work. */
function AboutSheet({ owned, onClose }: { owned: number; onClose: () => void }) {
  const items: [string, string][] = [
    ["Adding friends", "Send a request to the email they use for Notified Law. Once they accept, you can chat, call and compare streaks. You can have up to 100 friends."],
    ["Messages", `${MESSAGE_RULE} If you remove a friend or block someone, your past messages stay read-only until they expire, so either of you can still report them.`],
    ["Groups", `Groups hold up to ${MAX_GROUP_MEMBERS} people. Whoever makes a group is its only admin and can add or remove people, rename it and change its picture. You can run up to ${MAX_OWNED_GROUPS} groups${owned ? ` (you run ${owned})` : ""}. ${GROUP_MESSAGE_RULE}`],
    ["Calls", "Call a friend, or anyone in a group can start a group call. Calls are voice only and end after 3 hours. Minimise a call to keep it going while you use the app."],
    ["Streaks", "Open the app on consecutive days to build a streak. A grey flame means today does not count yet."],
    ["Blocking and reports", "Blocking someone removes them as a friend, takes you out of each other's groups and stops them finding, messaging or calling you. They are not told. Hold a message to report it."],
  ];
  return (
    <Sheet label="About Friends" onClose={onClose}>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
        <span />
        <h2 className="m-0 text-[17px] font-semibold">About Friends</h2>
        <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button>
      </div>
      <dl className="m-0 flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map(([title, text]) => (
          <div key={title} className="flex flex-col gap-1">
            <dt className="text-[15px] font-semibold">{title}</dt>
            <dd className="m-0 text-[14px] leading-snug text-muted">{text}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}

// ---- Small pieces ----------------------------------------------------------------------------------------------------

const RoundButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-11 shrink-0 place-items-center rounded-full border border-edge/10 bg-surface text-blue hover:bg-hover active:opacity-60">{children}</button>
);

const AddFriendIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M19 8v6M16 11h6" /></svg>
);

export const Who = ({ name, sub }: { name: string; sub: string }) => (
  <span className="flex min-w-0 flex-1 flex-col">
    <span className="truncate text-[16px] font-semibold">{name}</span>
    {sub && <span className="truncate text-[14px] text-faint">{sub}</span>}
  </span>
);

export const Check = ({ on }: { on: boolean }) => (
  <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-blue text-white" : "border-[1.5px] border-faint/50"}`}>
    {on && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8.5 3.2 3.2L13 4.5" /></svg>}
  </span>
);

/** Streak with a flame: orange once today counts, grey while it still needs today to carry on. */
export function StreakTag({ streak, today }: { streak: number; today: boolean }) {
  if (!streak) return null;
  return (
    <span className={`flex shrink-0 items-center gap-0.5 text-[13px] font-semibold tabular-nums ${today ? "text-[#C4552B]" : "text-faint"}`} aria-label={`${streak}-day streak${today ? "" : ", not yet active today"}`}>
      <Icon name="flame" size={13} />{streak}
    </span>
  );
}
