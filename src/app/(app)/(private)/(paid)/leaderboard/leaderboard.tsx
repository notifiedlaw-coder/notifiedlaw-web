"use client";

import { useEffect, useMemo, useState } from "react";
import type { FriendLists } from "@/lib/friends";
import { PLAYERS, QUIZ, SCHOOL, sampleScore, type Player } from "./mock";

type Period = "week" | "all";
type Scope = "school" | "everyone" | "friends";
const POINTS_PER_ANSWER = 20;

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const nf = new Intl.NumberFormat("en-GB");
/** Days and hours from now until the week ends (Sunday 23:59 UTC), for the quiz countdown. */
function closes(today: string) {
  const d = new Date(`${today}T00:00:00Z`);
  const days = (7 - d.getUTCDay()) % 7;
  return days === 0 ? "Closes tonight" : `Closes in ${days} ${days === 1 ? "day" : "days"}`;
}
const weekNumber = (today: string) => {
  const d = new Date(`${today}T00:00:00Z`);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getUTCDay() + 1) / 7);
};

/** Sends a friends API call; the updated lists, or the error message to show. */
async function friendsCall(method: string, url: string, body?: unknown): Promise<FriendLists | string> {
  try {
    const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json().catch(() => ({}))) as FriendLists & { error?: string };
    return res.ok ? data : data.error ?? "Something went wrong. Try again.";
  } catch {
    return "You seem to be offline. Try again.";
  }
}

/**
 * Leaderboard: a mock-up with sample standings. A podium, your place and the gap to the next, the weekly quiz, and the
 * table. Friends and friend requests are real; friends' points are samples like everyone else's.
 */
export function Leaderboard({ today, initialFriends }: { today: string; initialFriends: FriendLists }) {
  const [period, setPeriod] = useState<Period>("week");
  const [scope, setScope] = useState<Scope>("school");
  const [bonus, setBonus] = useState(0); // points from this session's quiz
  const [quiz, setQuiz] = useState(false);
  const [taken, setTaken] = useState(false);
  const [lists, setLists] = useState(initialFriends);
  const [sheet, setSheet] = useState(false);
  const friendsView = scope === "friends";

  const rows = useMemo(() => {
    const key = period === "week" ? "week" : "all";
    const players: Player[] = friendsView
      ? [PLAYERS.find((p) => p.id === "me")!, ...lists.friends.map((f) => ({ id: f.id, name: f.name, school: f.school ?? "", ...sampleScore(f.id) }))]
      : PLAYERS.filter((p) => scope === "everyone" || p.school === SCHOOL);
    return players
      .map((p) => ({ ...p, pts: p[key] + (p.id === "me" ? bonus : 0) }))
      .sort((a, b) => b.pts - a.pts)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [period, scope, friendsView, lists.friends, bonus]);
  const me = rows.find((r) => r.id === "me")!;
  const above = rows[me.rank - 2];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const gap = above ? above.pts - me.pts : 0;
  const lastWeekly = rows.length - 3; // the last three places drop a league each week

  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 md:gap-7 md:px-10 md:pt-8">
      <h1 className="sr-only">Leaderboard</h1>
      <p role="note" className="m-0 w-fit rounded-full bg-fill px-3 py-1 text-xs font-medium text-muted">Preview with sample standings</p>

      {/* The weekly quiz: the way to climb. */}
      <section aria-label="Weekly quiz" className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#5e5ce6] via-[#7d5bd6] to-[#bf5af2] p-5 text-white shadow-card md:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-white/75">Week {weekNumber(today)} · {closes(today)}</span>
            <h2 className="m-0 text-[28px] font-bold leading-tight tracking-[-0.03em]">{taken ? "Quiz done for this week" : "This week's quiz"}</h2>
            <p className="m-0 max-w-[440px] text-[15px] leading-snug text-white/85">{taken ? `You earned ${bonus} points. Come back next week for a new set.` : `${QUIZ.length} questions on the law you have been studying. ${POINTS_PER_ANSWER} points for each right answer.`}</p>
          </div>
          <button type="button" disabled={taken} onClick={() => setQuiz(true)} className="h-12 shrink-0 rounded-[14px] border-0 bg-white px-7 text-[16px] font-semibold text-[#4b3ab5] transition-transform active:scale-[0.97] disabled:opacity-60">{taken ? "Completed" : "Start the quiz"}</button>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <Seg label="Period" value={period} onChange={setPeriod} options={[["week", "This week"], ["all", "All time"]]} />
        <Seg label="Who" value={scope} onChange={setScope} options={[["school", "My university"], ["everyone", "Everyone"], ["friends", lists.incoming.length ? `Friends (${lists.incoming.length})` : "Friends"]]} />
      </div>

      {friendsView && lists.incoming.length > 0 && <Requests incoming={lists.incoming} onLists={setLists} />}

      {friendsView && !lists.friends.length ? (
        <section aria-label="Friends" className="flex flex-col items-center gap-3 rounded-[22px] bg-surface px-6 py-10 text-center shadow-card">
          <span aria-hidden className="grid size-16 place-items-center rounded-full bg-blue/10 text-blue"><PeopleIcon size={30} /></span>
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Compete with friends</h2>
          <p className="m-0 max-w-[340px] text-[15px] leading-snug text-muted">Add friends by the email they signed up with. Once they accept, you will see how you rank against each other every week.</p>
          <button type="button" onClick={() => setSheet(true)} className="mt-2 h-[50px] rounded-[14px] border-0 bg-blue px-8 text-[17px] font-semibold text-white transition-transform active:scale-[0.97]">Add friends</button>
          {lists.outgoing.length > 0 && <button type="button" onClick={() => setSheet(true)} className="border-0 bg-transparent text-[15px] text-link">{lists.outgoing.length} {lists.outgoing.length === 1 ? "request" : "requests"} waiting</button>}
        </section>
      ) : <>

      {/* Podium. */}
      <section aria-label="Top three" className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {[top3[1], top3[0], top3[2]].map((p, i) => p && (
          <div key={p.id} className={`flex flex-col items-center gap-2 rounded-[22px] bg-surface px-2 pb-4 pt-5 text-center shadow-card sm:px-4 ${i === 1 ? "pb-6 pt-7 sm:pb-8" : ""}`}>
            <div className="relative">
              <Avatar p={p} size={i === 1 ? 72 : 56} />
              <span aria-label={`Rank ${p.rank}`} className="absolute -bottom-1.5 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full text-[12px] font-bold text-white shadow" style={{ background: p.rank === 1 ? "#FFB800" : p.rank === 2 ? "#9AA0A6" : "#C77B3A" }}>{p.rank}</span>
            </div>
            <span className="mt-1 line-clamp-2 min-h-[2.4em] text-[13px] font-semibold leading-tight sm:text-[14px]">{p.name}</span>
            <span className="text-[17px] font-bold tabular-nums tracking-[-0.01em] sm:text-[20px]">{nf.format(p.pts)}</span>
            <span className="hidden text-[11px] text-muted sm:block">{p.school}</span>
          </div>
        ))}
      </section>

      {/* You. */}
      <section aria-label="Your place" className="flex flex-col gap-4 rounded-[22px] bg-surface p-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center leading-none">
            <span className="text-[44px] font-bold tabular-nums tracking-[-0.04em] text-blue">#{me.rank}</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">of {rows.length}</span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-[17px] font-semibold tabular-nums">{nf.format(me.pts)} points</span>
            <Move n={me.move} label="since last week" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:max-w-[320px]">
          {above ? (
            <>
              <span className="text-[13px]"><b className="font-semibold tabular-nums">{nf.format(gap)} points</b> to pass {above.name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={above.pts} aria-valuenow={me.pts} aria-label="Progress to the next place">
                <span className="block h-full rounded-full bg-blue transition-[width] duration-700" style={{ width: `${Math.min(100, (me.pts / above.pts) * 100)}%` }} />
              </span>
            </>
          ) : <span className="text-[14px] font-medium text-green">You are in first place. Keep it up.</span>}
          <span className="text-[12px] text-muted">{me.streak}-day study streak · quizzes score the most</span>
        </div>
      </section>

      {/* The table. */}
      <section aria-label="Rankings" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Rankings</h2>
          {friendsView
            ? <button type="button" onClick={() => setSheet(true)} className="border-0 bg-transparent text-[15px] text-link">Add or manage</button>
            : period === "week" && <span className="text-[12px] text-muted"><Dot c="#34C759" /> Moves up <span className="mx-1.5" /> <Dot c="#FF3B30" /> Moves down</span>}
        </div>
        <ol className="m-0 flex list-none flex-col overflow-hidden rounded-[18px] bg-surface p-0 shadow-card">
          {rest.map((p) => {
            const mine = p.id === "me";
            const zone = period === "week" && !friendsView ? (p.rank <= 5 ? "#34C759" : p.rank > lastWeekly ? "#FF3B30" : null) : null;
            return (
              <li key={p.id} aria-current={mine || undefined} className={`relative flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0 ${mine ? "bg-blue/[0.07]" : ""}`}>
                {zone && <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: zone }} />}
                <span className="w-7 shrink-0 text-center text-[15px] font-semibold tabular-nums text-muted">{p.rank}</span>
                <Avatar p={p} size={40} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`truncate text-[15px] ${mine ? "font-bold" : "font-medium"}`}>{p.name}</span>
                  <span className="truncate text-[12px] text-muted">{p.school}</span>
                </span>
                <span className="hidden sm:block"><Move n={p.move} compact /></span>
                <span className="w-16 shrink-0 text-right text-[15px] font-semibold tabular-nums">{nf.format(p.pts)}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Phones: your place stays in view while you scroll the table. */}
      <div aria-hidden className="pointer-events-none sticky bottom-3 z-10 -mt-2 sm:hidden">
        <div className="pointer-events-auto flex items-center gap-3 rounded-[20px] bg-surface/90 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.18),0_0_0_0.5px_var(--hairline)] backdrop-blur-xl">
          <span className="text-[20px] font-bold tabular-nums text-blue">#{me.rank}</span>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">You</span>
          <span className="text-[15px] font-semibold tabular-nums">{nf.format(me.pts)}</span>
        </div>
      </div>
      </>}

      {sheet && <FriendsSheet lists={lists} onLists={setLists} onClose={() => setSheet(false)} />}
      {quiz && <QuizSheet onClose={() => setQuiz(false)} onFinish={(points) => { setBonus(points); setTaken(true); setPeriod("week"); }} />}
    </div>
  );
}

// ---- Quiz ------------------------------------------------------------------------------------------------------------

function QuizSheet({ onClose, onFinish }: { onClose: () => void; onFinish: (points: number) => void }) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const q = QUIZ[at];
  const points = right * POINTS_PER_ANSWER;

  function advance() {
    if (at === QUIZ.length - 1) { setDone(true); onFinish(points); }
    else { setAt(at + 1); setPicked(null); }
  }

  return (
    <Sheet label="Weekly quiz" onClose={onClose}>
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
          <button type="button" onClick={onClose} className="justify-self-start border-0 bg-transparent text-[17px] text-link">{done ? "" : "Close"}</button>
          <h2 className="m-0 text-[17px] font-semibold">{done ? "Results" : `Question ${at + 1} of ${QUIZ.length}`}</h2>
          {done ? <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button> : <span className="justify-self-end text-[13px] font-semibold tabular-nums text-muted">{points} pts</span>}
        </div>
        {!done && (
          <div className="mx-4 mb-1 flex gap-1" aria-hidden>
            {QUIZ.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < at || (i === at && picked !== null) ? "bg-blue" : i === at ? "bg-blue/40" : "bg-track"}`} />)}
          </div>
        )}

        {done ? (
          <div className="flex flex-col items-center gap-3 overflow-y-auto px-6 pb-8 pt-6 text-center">
            <span aria-hidden className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-[#FFB800] to-[#FF9500] text-[34px] font-bold text-white shadow-[0_8px_24px_rgba(255,149,0,0.4)]">{right}</span>
            <h3 className="m-0 text-[24px] font-bold tracking-[-0.02em]">{right === QUIZ.length ? "Perfect score" : right >= 3 ? "Well done" : "Good effort"}</h3>
            <p className="m-0 text-[15px] leading-snug text-muted">{right} of {QUIZ.length} right. <b className="font-semibold text-ink">+{points} points</b> added to your week.</p>
            <button type="button" onClick={onClose} className="mt-3 h-[50px] w-full rounded-[14px] border-0 bg-blue text-[17px] font-semibold text-white">See the leaderboard</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              <p className="m-0 text-pretty text-[19px] font-semibold leading-snug tracking-[-0.01em]">{q.q}</p>
              <div role="radiogroup" aria-label="Answers" className="flex flex-col gap-2">
                {q.options.map((o, i) => {
                  const state = picked === null ? "idle" : i === q.answer ? "right" : i === picked ? "wrong" : "dim";
                  return (
                    <button key={o} type="button" role="radio" aria-checked={picked === i} disabled={picked !== null} onClick={() => { setPicked(i); if (i === q.answer) setRight((n) => n + 1); }}
                      className={`flex min-h-[52px] w-full items-center gap-3 rounded-[14px] border-0 px-4 py-2.5 text-left text-[15px] transition-colors ${state === "right" ? "bg-green/15 font-semibold text-[#1c7c38]" : state === "wrong" ? "bg-red/12 font-semibold text-red" : state === "dim" ? "bg-surface text-muted opacity-60" : "bg-surface text-ink shadow-card active:bg-fill"}`}>
                      <span className="min-w-0 flex-1">{o}</span>
                      {state === "right" && <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3 8.5 3.2 3.2L13 4.5" /></svg>}
                      {state === "wrong" && <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m4 4 8 8M12 4l-8 8" /></svg>}
                    </button>
                  );
                })}
              </div>
              {picked !== null && <p role="status" className="m-0 rounded-[14px] bg-fill px-3.5 py-3 text-[14px] leading-snug">{picked === q.answer ? <b className="font-semibold text-green">Correct. </b> : <b className="font-semibold text-red">Not quite. </b>}{q.why}</p>}
            </div>
            <div className="shrink-0 border-t border-edge/[0.08] bg-canvas/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
              <button type="button" disabled={picked === null} onClick={advance} className="h-[50px] w-full rounded-[14px] border-0 bg-blue text-[17px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-35">{at === QUIZ.length - 1 ? "Finish" : "Next question"}</button>
            </div>
          </>
        )}
    </Sheet>
  );
}

// ---- Friends ---------------------------------------------------------------------------------------------------------

type Lists = (l: FriendLists) => void;

/** Friend requests waiting on you, with Accept and Decline, at the top of the Friends view. */
function Requests({ incoming, onLists }: { incoming: FriendLists["incoming"]; onLists: Lists }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function answer(id: string, accept: boolean) {
    setBusy(id);
    setError("");
    const r = await friendsCall(accept ? "POST" : "DELETE", `/api/friends/${encodeURIComponent(id)}`);
    setBusy(null);
    if (typeof r === "string") setError(r);
    else onLists(r);
  }
  return (
    <section aria-label="Friend requests" className="flex flex-col gap-2">
      <h2 className="m-0 px-1 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">Friend requests</h2>
      <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[18px] bg-surface p-0 shadow-card">
        {incoming.map((f) => (
          <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-3 first:border-0">
            <Avatar p={{ id: f.id, name: f.name, hue: sampleScore(f.id).hue }} size={40} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">{f.name}</span>
              {f.school && <span className="truncate text-[12px] text-muted">{f.school}</span>}
            </span>
            <button type="button" disabled={busy === f.id} onClick={() => answer(f.id, false)} className="h-8 shrink-0 rounded-full border-0 bg-fill px-3.5 text-[14px] font-semibold text-ink disabled:opacity-50">Decline</button>
            <button type="button" disabled={busy === f.id} onClick={() => answer(f.id, true)} className="h-8 shrink-0 rounded-full border-0 bg-blue px-3.5 text-[14px] font-semibold text-white disabled:opacity-50">Accept</button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="m-0 px-1 text-[13px] text-red">{error}</p>}
    </section>
  );
}

/** Add a friend by email, see who has not answered yet, and remove friends. */
function FriendsSheet({ lists, onLists, onClose }: { lists: FriendLists; onLists: Lists; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null); // a friend whose Remove was tapped once

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setNote(null);
    const was = lists.friends.length;
    const r = await friendsCall("POST", "/api/friends", { email: email.trim() });
    setSending(false);
    if (typeof r === "string") return setNote({ ok: false, text: r });
    onLists(r);
    setEmail("");
    setNote({ ok: true, text: r.friends.length > was ? "They had already asked, so you are now friends." : "Request sent. They will see it on their Leaderboard." });
  }

  async function drop(id: string) {
    setBusy(id);
    const r = await friendsCall("DELETE", `/api/friends/${encodeURIComponent(id)}`);
    setBusy(null);
    setConfirm(null);
    if (typeof r === "string") setNote({ ok: false, text: r });
    else onLists(r);
  }

  const row = (f: FriendLists["friends"][number], action: React.ReactNode) => (
    <li key={f.id} className="flex items-center gap-3 border-t border-edge/[0.06] px-4 py-2.5 first:border-0">
      <Avatar p={{ id: f.id, name: f.name, hue: sampleScore(f.id).hue }} size={36} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">{f.name}</span>
        {f.school && <span className="truncate text-[12px] text-muted">{f.school}</span>}
      </span>
      {action}
    </li>
  );

  return (
    <Sheet label="Friends" onClose={onClose}>
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
        <span />
        <h2 className="m-0 text-[17px] font-semibold">Friends</h2>
        <button type="button" onClick={onClose} className="justify-self-end border-0 bg-transparent text-[17px] font-semibold text-link">Done</button>
      </div>
      <div className="flex flex-col gap-6 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <form onSubmit={send} className="flex flex-col gap-2">
          <label htmlFor="friend-email" className="px-1 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">Add a friend</label>
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
            <h3 className="m-0 px-1 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">Sent</h3>
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[16px] bg-surface p-0 shadow-card">
              {lists.outgoing.map((f) => row(f, <button type="button" disabled={busy === f.id} onClick={() => drop(f.id)} className="shrink-0 border-0 bg-transparent text-[15px] text-link disabled:opacity-50">Cancel</button>))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="m-0 px-1 text-[13px] font-semibold uppercase tracking-[0.05em] text-muted">Your friends</h3>
          {lists.friends.length ? (
            <ul className="m-0 flex list-none flex-col overflow-hidden rounded-[16px] bg-surface p-0 shadow-card">
              {lists.friends.map((f) => row(f, confirm === f.id
                ? <button type="button" disabled={busy === f.id} onClick={() => drop(f.id)} className="h-8 shrink-0 rounded-full border-0 bg-red px-3.5 text-[14px] font-semibold text-white disabled:opacity-50">Remove</button>
                : <button type="button" onClick={() => setConfirm(f.id)} className="shrink-0 border-0 bg-transparent text-[15px] text-red">Remove</button>))}
            </ul>
          ) : <p className="m-0 rounded-[16px] bg-surface px-4 py-3 text-[15px] text-muted shadow-card">No friends yet.</p>}
        </section>
      </div>
    </Sheet>
  );
}

// ---- Small pieces ----------------------------------------------------------------------------------------------------

/** An iOS-style bottom sheet (a centred card on wide screens). Escape and the backdrop close it. */
function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <div onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" style={{ animation: "tt-fade 0.25s ease-out" }} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.25)] md:max-w-[520px] md:rounded-[28px]" style={{ animation: "tt-sheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)" }}>
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-faint/40 md:hidden" />
        {children}
      </div>
    </div>
  );
}

const PeopleIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.1.7 3.5 2.6 3.5 5.6" />
  </svg>
);

function Avatar({ p, size }: { p: Pick<Player, "name" | "hue" | "id">; size: number }) {
  const me = p.id === "me";
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.36, background: me ? "var(--color-blue)" : `linear-gradient(145deg, hsl(${p.hue} 70% 58%), hsl(${(p.hue + 35) % 360} 65% 46%))` }}>{me ? "Me" : initials(p.name)}</span>
  );
}

function Move({ n, label, compact }: { n: number; label?: string; compact?: boolean }) {
  if (n === 0) return <span className="text-[12px] text-faint">{compact ? "–" : `No change ${label ?? ""}`}</span>;
  const up = n > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${up ? "text-green" : "text-red"}`} aria-label={`${up ? "Up" : "Down"} ${Math.abs(n)} ${Math.abs(n) === 1 ? "place" : "places"}`}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden className={up ? "" : "rotate-180"}><path d="M5 1.5 9 8H1z" /></svg>
      {Math.abs(n)}{label ? <span className="font-normal text-muted"> {label}</span> : null}
    </span>
  );
}

const Dot = ({ c }: { c: string }) => <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full align-middle" style={{ background: c }} />;

function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="radiogroup" aria-label={label} className={`nl-type-fixed flex rounded-[10px] bg-[rgba(118,118,128,0.12)] p-0.5 ${options.length > 2 ? "sm:w-[380px]" : "sm:w-[260px]"}`}>
      {options.map(([k, text]) => (
        <button key={k} type="button" role="radio" aria-checked={k === value} onClick={() => onChange(k)}
          className={`min-h-9 flex-1 rounded-[8px] border-0 px-3 text-[13px] font-medium transition-all ${k === value ? "bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.15)]" : "bg-transparent text-ink"}`}>{text}</button>
      ))}
    </div>
  );
}
