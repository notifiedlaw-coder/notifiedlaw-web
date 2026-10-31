"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/sheet";
import type { Friend } from "@/lib/friend-view";
import { PLAYERS, QUIZ, SCHOOL, sampleScore, type Player } from "./mock";

type Period = "week" | "all";
type Scope = "school" | "everyone" | "friends";
const POINTS_PER_ANSWER = 20;

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

/**
 * Leaderboard: a mock-up with sample standings. A podium, your place and the gap to the next, the weekly quiz, and the
 * table. Friends and streaks are real (friends are managed on the Friends page); points are
 * samples for everyone.
 */
export function Leaderboard({ today, initialFriends, myStreak }: { today: string; initialFriends: Friend[]; myStreak: number }) {
  // Hick's law: this week only, and one switch for whom you are ranked against.
  const period: Period = "week";
  const [scope, setScope] = useState<Scope>("school");
  const [bonus, setBonus] = useState(0); // points from this session's quiz
  const [quiz, setQuiz] = useState(false);
  const [taken, setTaken] = useState(false);
  const friends = initialFriends;
  const friendsView = scope === "friends";

  const rows = useMemo(() => {
    const key = period === "week" ? "week" : "all";
    const players: Player[] = friendsView
      ? [PLAYERS.find((p) => p.id === "me")!, ...friends.map((f) => ({ id: f.id, name: f.name, school: f.school ?? "", ...sampleScore(f.id), streak: f.streak }))]
      : PLAYERS.filter((p) => scope === "everyone" || p.school === SCHOOL);
    return players
      .map((p) => (p.id === "me" ? { ...p, streak: myStreak, pts: p[key] + bonus } : { ...p, pts: p[key] }))
      .sort((a, b) => b.pts - a.pts)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [period, scope, friendsView, friends, myStreak, bonus]);
  const me = rows.find((r) => r.id === "me")!;
  const above = rows[me.rank - 2];
  const gap = above ? above.pts - me.pts : 0;
  const where = scope === "school" ? "at your university" : scope === "friends" ? "among friends" : "in Ghana";

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-[18px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 md:px-8 md:pt-7 lg:pt-10">
      <div className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Week {weekNumber(today)} · {closes(today)}</span>
        <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">This week&rsquo;s quiz</h1>
        <p role="note" className="m-0 text-[14px] text-faint">Preview with sample standings</p>
      </div>

      {/* Your rank, then the one thing to do: take the quiz. */}
      <section aria-label="Your place" className="flex flex-wrap items-center justify-between gap-5 rounded-[22px] bg-[#23305C] p-6 text-[#F6F5F2]">
        <div className="flex flex-wrap items-baseline gap-7">
          <span className="flex flex-col"><span className="font-display text-[56px] leading-none">#{me.rank}</span><span className="text-[14px] text-[#C5CDE6]">Your rank {where}</span></span>
          <span className="flex flex-col"><span className="font-display text-[56px] leading-none">{me.streak}</span><span className="text-[14px] text-[#C5CDE6]">Day streak</span></span>
        </div>
        <div className="flex flex-col items-start gap-2">
          <button type="button" disabled={taken} onClick={() => setQuiz(true)} className="h-[52px] cursor-pointer rounded-full border-0 bg-[#E0683A] px-6 text-[16px] font-bold text-[#161A26] disabled:opacity-60">{taken ? `Done · +${bonus} points` : "Take this week’s quiz"}</button>
          <span className="text-[13px] text-[#C5CDE6]">{above ? `${nf.format(gap)} points to pass ${above.name}` : "You are in first place."}</span>
        </div>
      </section>

      <Seg label="Who" value={scope} onChange={setScope} options={[["school", "University"], ["everyone", "Ghana"], ["friends", "Friends"]]} />

      {friendsView && !friends.length ? (
        <section aria-label="Friends" className="flex flex-col items-center gap-3 rounded-[18px] border border-edge/10 bg-surface px-6 py-10 text-center">
          <h2 className="m-0 text-[28px]">Compete with friends</h2>
          <p className="m-0 max-w-[340px] text-[16px] leading-snug text-muted">Once you have friends, you will see how you rank against each other here.</p>
          <Link href="/friends" className="mt-2 grid h-12 place-items-center rounded-full bg-blue px-7 text-[16px] font-semibold" style={{ textDecoration: "none", color: "#fff" }}>Add friends</Link>
        </section>
      ) : <>
      <ol aria-label="Rankings" className="m-0 flex list-none flex-col overflow-hidden rounded-[18px] border border-edge/10 bg-surface p-0">
        {rows.map((p) => {
          const mine = p.id === "me";
          return (
            <li key={p.id} aria-current={mine || undefined} className={`flex min-h-[60px] items-center gap-3.5 border-t border-edge/[0.07] px-[18px] py-2.5 first:border-0 ${mine ? "bg-tint" : ""}`}>
              <span className={`w-8 shrink-0 font-display text-[24px] tabular-nums ${p.rank <= 3 && !mine ? "text-amber" : "text-faint"}`}>{p.rank}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[16px] font-semibold">{mine ? `${p.name} (you)` : p.name}</span>
                <span className="truncate text-[13px] text-faint">{p.school}</span>
              </span>
              <span className="hidden sm:block"><Move n={p.move} compact /></span>
              <span className="shrink-0 text-right text-[16px] font-semibold tabular-nums">{nf.format(p.pts)}</span>
            </li>
          );
        })}
      </ol>

      {/* Phones: your place stays in view while you scroll the table. */}
      <div aria-hidden className="pointer-events-none sticky bottom-3 z-10 -mt-2 sm:hidden">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-edge/10 bg-surface px-5 py-2.5 shadow-[0_8px_24px_rgba(22,26,38,0.12)]">
          <span className="font-display text-[22px] tabular-nums text-blue">#{me.rank}</span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">You</span>
          <span className="text-[15px] font-semibold tabular-nums">{nf.format(me.pts)}</span>
        </div>
      </div>
      </>}

      {quiz && <QuizSheet onClose={() => setQuiz(false)} onFinish={(points) => { setBonus(points); setTaken(true); }} />}
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
            <span aria-hidden className="grid size-20 place-items-center rounded-full bg-[#23305C] font-display text-[40px] text-[#F6F5F2]">{right}</span>
            <h3 className="m-0 font-display text-[30px] font-normal">{right === QUIZ.length ? "Perfect score" : right >= 3 ? "Well done" : "Good effort"}</h3>
            <p className="m-0 text-[15px] leading-snug text-muted">{right} of {QUIZ.length} right. <b className="font-semibold text-ink">+{points} points</b> added to your week.</p>
            <button type="button" onClick={onClose} className="mt-3 h-[50px] w-full rounded-full border-0 bg-blue text-[17px] font-semibold text-white">See the leaderboard</button>
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
              <button type="button" disabled={picked === null} onClick={advance} className="h-[50px] w-full rounded-full border-0 bg-blue text-[17px] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-35">{at === QUIZ.length - 1 ? "Finish" : "Next question"}</button>
            </div>
          </>
        )}
    </Sheet>
  );
}

// ---- Small pieces ----------------------------------------------------------------------------------------------------

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

function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="radiogroup" aria-label={label} className="nl-type-fixed flex self-start rounded-xl bg-fill p-1">
      {options.map(([k, text]) => (
        <button key={k} type="button" role="radio" aria-checked={k === value} onClick={() => onChange(k)}
          className={`h-10 cursor-pointer rounded-[9px] border-0 px-[18px] text-[15px] text-ink ${k === value ? "bg-surface font-bold shadow-[0_1px_2px_rgba(22,26,38,0.08)]" : "bg-transparent font-medium"}`}>{text}</button>
      ))}
    </div>
  );
}
