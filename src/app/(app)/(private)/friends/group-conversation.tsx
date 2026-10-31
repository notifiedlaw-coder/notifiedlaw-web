"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, uploadPhoto } from "@/components/avatar";
import { useCalls } from "@/components/calls";
import { useFriends } from "@/components/friends";
import { ReportSheet, type ReportTarget } from "@/components/report";
import { Sheet } from "@/components/sheet";
import { GROUP_MESSAGE_RULE, MAX_GROUP_MEMBERS, MAX_GROUP_NAME, type GroupDetail, type GroupMessage, type Typer } from "@/lib/friend-view";
import { ChatView, HeaderButton, InfoIcon, PhoneIcon, typingLabel, type ChatMessage } from "./chat";
import { SheetRow } from "./conversation";
import { Check, useFriendsShell } from "./friends-shell";

/** How often an open group checks for new messages; faster while someone types. */
const POLL_MS = 4_000;
const TYPING_POLL_MS = 2_000;

/** A group conversation: messages from everyone in it, group calls, and the group's details. */
export function GroupConversation({ initialGroup, initial }: { initialGroup: GroupDetail; initial: GroupMessage[] }) {
  const router = useRouter();
  const { me, groups, reload, now } = useFriendsShell();
  const { refresh } = useFriends();
  const { start } = useCalls();
  const [group, setGroup] = useState(initialGroup);
  const [messages, setMessages] = useState<(GroupMessage & { pending?: boolean })[]>(initial);
  const [info, setInfo] = useState(false);
  const [typers, setTypers] = useState<Typer[]>([]);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const live = groups.find((g) => g.id === group.id);
  const callOn = !!live?.call;

  useEffect(() => { reload(); refresh(); }, [reload, refresh]);
  // Name, picture and members can change while the group is open (the admin's sheet, or someone leaving).
  useEffect(() => {
    if (live && (live.name !== group.name || live.avatar !== group.avatar || live.members !== group.members.length))
      fetch(`/api/groups/${group.id}`).then((r) => (r.ok ? (r.json() as Promise<{ group: GroupDetail }>) : null)).then((d) => { if (d) setGroup(d.group); }).catch(() => {});
  }, [live, group]);

  const poll = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const last = messages.findLast((m) => !m.pending)?.at ?? 0;
    try {
      const r = await fetch(`/api/groups/${group.id}/messages${last ? `?after=${last}` : ""}`);
      if (r.status === 403) return router.push("/friends"); // removed from the group
      if (!r.ok) return;
      const d = (await r.json()) as { messages: GroupMessage[]; typing: Typer[] };
      setTypers((cur) => (cur.map((t) => t.id).join() === d.typing.map((t) => t.id).join() ? cur : d.typing));
      if (!d.messages.length) return;
      setMessages((cur) => {
        const ids = new Set(cur.map((m) => m.id));
        const fresh = d.messages.filter((m) => !ids.has(m.id));
        return fresh.length ? [...cur, ...fresh] : cur;
      });
      if (d.messages.some((m) => !m.fromMe)) { reload(); refresh(); }
    } catch {}
  }, [group.id, messages, reload, refresh, router]);

  useEffect(() => {
    const t = setInterval(poll, typers.length ? TYPING_POLL_MS : POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", poll); };
  }, [poll, typers.length]);

  const onTyping = useCallback((on: boolean) => {
    void fetch("/api/typing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: group.id, on }), keepalive: true }).catch(() => {});
  }, [group.id]);

  async function send(body: string) {
    const temp = { id: `tmp-${Date.now()}`, fromId: me.id, fromMe: true, name: me.name, avatar: me.avatar, body, at: Date.now(), pending: true };
    setMessages((cur) => [...cur, temp]);
    try {
      const r = await fetch(`/api/groups/${group.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) });
      const d = (await r.json().catch(() => ({}))) as { message?: GroupMessage; error?: string };
      if (!r.ok || !d.message) throw new Error(d.error ?? "Your message was not sent. Try again.");
      setMessages((cur) => cur.map((m) => (m.id === temp.id ? d.message! : m)));
      reload();
      return null;
    } catch (e) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      return e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.";
    }
  }

  const header = (
    <header className="flex shrink-0 items-center gap-3 border-b-[0.5px] border-edge/15 bg-surface/80 px-4 py-2.5 backdrop-blur-xl">
      <button type="button" onClick={() => setInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent p-0 text-left text-ink">
        <Avatar id={group.id} name={group.name} src={group.avatar} size={38} group />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[16px] font-semibold">{group.name}</span>
          <span className={`truncate text-[12px] ${callOn || typers.length ? "font-medium text-green" : "text-muted"}`}>{typers.length ? typingLabel(typers) : callOn ? "Call in progress" : `${group.members.length} members`}</span>
        </span>
      </button>
      {callOn
        ? <button type="button" onClick={() => start({ groupId: group.id }, group.name)} className="h-9 shrink-0 rounded-full border-0 bg-green px-4 text-[15px] font-semibold text-white">Join</button>
        : <HeaderButton label="Group voice call" onClick={() => start({ groupId: group.id }, group.name)}><PhoneIcon /></HeaderButton>}
      <HeaderButton label="Group info" onClick={() => setInfo(true)}><InfoIcon /></HeaderButton>
    </header>
  );

  return (
    <>
      <ChatView group header={header} typers={typers} onTyping={onTyping} messages={messages as ChatMessage[]} rule={GROUP_MESSAGE_RULE} now={now} empty="No messages yet. Say hello to the group."
        onSend={send} onReport={(m) => setReporting({ kind: "group_message", target: m.id, what: "message" })} />
      {info && <GroupInfo group={group} setGroup={setGroup} onClose={() => setInfo(false)} onReport={() => { setInfo(false); setReporting({ kind: "group", target: group.id, what: "group" }); }} />}
      {reporting && <ReportSheet item={reporting} onClose={() => setReporting(null)} />}
    </>
  );
}

/** Members, and for the admin: picture, name, adding and removing people, deleting. Others can leave or report. */
function GroupInfo({ group, setGroup, onClose, onReport }: { group: GroupDetail; setGroup: (g: GroupDetail) => void; onClose: () => void; onReport: () => void }) {
  const router = useRouter();
  const { me, lists, reload } = useFriendsShell();
  const admin = group.ownerId === me.id;
  const [name, setName] = useState(group.name);
  const [adding, setAdding] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const memberIds = new Set(group.members.map((m) => m.id));
  const candidates = lists.friends.filter((f) => !memberIds.has(f.id));
  const room = MAX_GROUP_MEMBERS - group.members.length;

  async function call(method: string, url: string, body?: unknown) {
    setError("");
    try {
      const r = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const d = (await r.json().catch(() => ({}))) as { group?: GroupDetail; error?: string };
      if (!r.ok) throw new Error(d.error ?? "That did not work. Try again.");
      if (d.group) setGroup(d.group);
      reload();
      return true;
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "You seem to be offline. Try again.");
      return false;
    } finally { setBusy(""); }
  }

  async function photo(f: File | undefined) {
    if (!f) return;
    setBusy("photo");
    const r = await uploadPhoto(`/api/groups/${group.id}/avatar`, f);
    setBusy("");
    if ("error" in r) return setError(r.error);
    setGroup({ ...group, avatar: r.avatar });
    reload();
  }

  async function leaveOrDelete() {
    setBusy("leave");
    if (await call("DELETE", `/api/groups/${group.id}`)) { onClose(); router.push("/friends"); }
  }

  return (
    <Sheet label="Group info" onClose={onClose}>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
        <span />
        <h2 className="m-0 text-[17px] font-semibold">Group info</h2>
        <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button>
      </div>
      <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-col items-center gap-2">
          <button type="button" disabled={!admin || busy === "photo"} onClick={() => file.current?.click()} className="border-0 bg-transparent p-0 disabled:opacity-100" aria-label={admin ? "Change group picture" : undefined}>
            <Avatar id={group.id} name={group.name} src={group.avatar} size={88} group />
          </button>
          {admin && (
            <>
              <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden onChange={(e) => { void photo(e.target.files?.[0]); e.target.value = ""; }} />
              <span className="flex gap-4">
                <button type="button" onClick={() => file.current?.click()} className="border-0 bg-transparent p-0 text-[15px] text-link">{busy === "photo" ? "Saving…" : group.avatar ? "Change picture" : "Add picture"}</button>
                {group.avatar && <button type="button" onClick={() => { setBusy("photo"); void fetch(`/api/groups/${group.id}/avatar`, { method: "DELETE" }).then(() => { setGroup({ ...group, avatar: null }); reload(); }).finally(() => setBusy("")); }} className="border-0 bg-transparent p-0 text-[15px] text-red">Remove</button>}
              </span>
            </>
          )}
        </div>

        {admin ? (
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && name !== group.name) { setBusy("name"); void call("PATCH", `/api/groups/${group.id}`, { name }); } }} className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_GROUP_NAME} aria-label="Group name"
              className="h-11 min-w-0 flex-1 rounded-[12px] border-0 bg-surface px-3.5 text-[16px] text-ink shadow-card outline-none focus:ring-2 focus:ring-blue/40" />
            <button type="submit" disabled={!name.trim() || name === group.name || busy === "name"} className="h-11 shrink-0 rounded-full border-0 bg-blue px-4 text-[16px] font-semibold text-white disabled:opacity-40">Rename</button>
          </form>
        ) : <h3 className="m-0 text-center text-[20px] font-semibold">{group.name}</h3>}

        {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h3 className="m-0 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">{group.members.length} of {MAX_GROUP_MEMBERS} members</h3>
            {admin && room > 0 && candidates.length > 0 && !adding && <button type="button" onClick={() => setAdding(new Set())} className="border-0 bg-transparent p-0 text-[15px] text-link">Add people</button>}
          </div>
          {adding ? (
            <>
              <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[16px] bg-surface p-0 shadow-card">
                {candidates.map((f) => {
                  const on = adding.has(f.id);
                  return (
                    <li key={f.id} className="border-t border-edge/[0.06] first:border-0">
                      <button type="button" role="checkbox" aria-checked={on} disabled={!on && adding.size >= room}
                        onClick={() => setAdding((s) => { const n = new Set(s); if (on) n.delete(f.id); else n.add(f.id); return n; })}
                        className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-2.5 text-left text-ink disabled:opacity-40">
                        <Avatar id={f.id} name={f.name} src={f.avatar} size={36} />
                        <span className="min-w-0 flex-1 truncate text-[15px]">{f.name}</span>
                        <Check on={on} />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAdding(null)} className="h-11 flex-1 rounded-[12px] border-0 bg-fill text-[16px] text-ink">Cancel</button>
                <button type="button" disabled={!adding.size || busy === "add"} onClick={() => { setBusy("add"); void call("POST", `/api/groups/${group.id}/members`, { members: [...adding] }).then((ok) => ok && setAdding(null)); }}
                  className="h-11 flex-1 rounded-full border-0 bg-blue text-[16px] font-semibold text-white disabled:opacity-40">Add {adding.size || ""}</button>
              </div>
            </>
          ) : (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[16px] bg-surface p-0 shadow-card">
              {group.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
                  <Avatar id={m.id} name={m.name} src={m.avatar} size={36} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{m.id === me.id ? "You" : m.name}</span>
                  {m.admin && <span className="shrink-0 rounded-full bg-fill px-2 py-0.5 text-[12px] font-medium text-muted">Admin</span>}
                  {admin && !m.admin && (confirm === m.id
                    ? <button type="button" disabled={busy === m.id} onClick={() => { setBusy(m.id); void call("DELETE", `/api/groups/${group.id}/members?user=${encodeURIComponent(m.id)}`).then(() => setConfirm("")); }} className="h-8 shrink-0 rounded-full border-0 bg-red px-3 text-[14px] font-semibold text-white">Remove</button>
                    : <button type="button" onClick={() => setConfirm(m.id)} className="shrink-0 border-0 bg-transparent text-[15px] text-red">Remove</button>)}
                </li>
              ))}
            </ul>
          )}
          {admin && <p className="m-0 px-1 text-[12px] text-muted">You can add friends of yours. Only you can change who is in the group.</p>}
        </section>

        <div className="flex flex-col overflow-hidden rounded-[16px] bg-surface shadow-card">
          {!admin && <SheetRow onClick={onReport}>Report group</SheetRow>}
          <SheetRow danger onClick={() => (confirm === "leave" ? void leaveOrDelete() : setConfirm("leave"))}>
            {confirm === "leave" ? (admin ? "Tap again to delete the group and its messages for everyone" : "Tap again to leave") : admin ? "Delete group" : "Leave group"}
          </SheetRow>
        </div>
        <p className="m-0 px-1 text-[12px] text-muted">{GROUP_MESSAGE_RULE} Any member can start a group call; calls end after 3 hours.</p>
      </div>
    </Sheet>
  );
}
