"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ATTEMPTS, COURSES, type MockCourse, type MockQuestion } from "./mock";

// ---- Setup and scoring (all sample behaviour: real marking will come from Notified AI) ------------------------------

type Format = "timed" | "practice";
type Size = "quick" | "standard" | "full";
const SIZES: Record<Size, { label: string; questions: number; minutes: number }> = {
  quick: { label: "Quick", questions: 1, minutes: 20 },
  standard: { label: "Standard", questions: 2, minutes: 60 },
  full: { label: "Full paper", questions: 3, minutes: 180 },
};
type Session = { course: MockCourse; format: Format; size: Size; questions: MockQuestion[] };
type Result = { session: Session; answers: string[]; seconds: number };

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
/** A sample mark: longer, fuller answers score higher. Not real marking. */
function markFor(q: MockQuestion, answer: string) {
  const w = words(answer);
  if (w < 15) return Math.round(q.marks * 0.12);
  const ratio = 0.4 + Math.min(w, 120) / 120 * 0.38 + (hash(q.id + answer.length) % 9) / 100;
  return Math.round(q.marks * Math.min(0.92, ratio));
}
const grade = (pct: number) => (pct >= 0.7 ? "A" : pct >= 0.6 ? "B" : pct >= 0.5 ? "C" : pct >= 0.4 ? "D" : "F");
const clock = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:` : ""}${String(Math.floor((s % 3600) / 60)).padStart(Math.floor(s / 3600) ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
const dayName = (today: string, plus: number) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(new Date(`${today}T00:00:00Z`).getTime() + plus * 86_400_000));

/** Exam Prep: a mock-up with sample content. Home, a session sheet, the exam room with its clock, and marked results. */
export function ExamPrep({ today }: { today: string }) {
  const [sheet, setSheet] = useState<{ course: MockCourse; format: Format } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const next = useMemo(() => [...COURSES].sort((a, b) => a.examInDays - b.examInDays)[0], []);
  const lowest = useMemo(() => [...COURSES].sort((a, b) => a.readiness - b.readiness)[0], []);

  function start(course: MockCourse, format: Format, size: Size) {
    setSheet(null);
    setResult(null);
    setSession({ course, format, size, questions: course.questions.slice(0, SIZES[size].questions) });
  }

  if (session && result) {
    return <Results r={result} onAgain={() => { setSession(null); setResult(null); setSheet({ course: result.session.course, format: result.session.format }); }} onDone={() => { setSession(null); setResult(null); }} />;
  }
  if (session) return <ExamRoom s={session} onExit={() => setSession(null)} onSubmit={(answers, seconds) => setResult({ session, answers, seconds })} />;

  const pick = lowest.questions[0];
  const last = ATTEMPTS[0];
  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-7 px-[18px] pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 md:px-8 md:pt-7 lg:px-14 lg:pt-10">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">Exam prep</h1>
        <p role="note" className="m-0 text-[14px] text-faint">Preview with sample questions and marking</p>
      </div>

      {/* Hick's law: one recommended question from the weakest course; choosing a course is the fallback. */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-label="Recommended question" className="flex flex-col gap-4 rounded-[22px] border border-edge/10 bg-surface p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-peach px-2.5 py-1 text-[13px] font-bold text-[var(--peach-fg)]">Recommended</span>
            <span className="text-[14px] text-faint">Your weakest course · {lowest.course}</span>
          </div>
          <h2 className="m-0 line-clamp-5 text-[28px] leading-[1.15] md:text-[30px]">{pick.kind}: {pick.text}</h2>
          <div className="flex flex-wrap gap-4 text-[15px] text-muted"><span>{SIZES.quick.minutes} minutes</span><span>{pick.marks} marks</span>{pick.kind === "Problem question" && <span>IRAC expected</span>}</div>
          <button type="button" onClick={() => start(lowest, "timed", "quick")} className="h-[52px] cursor-pointer self-start rounded-full border-0 bg-blue px-6 text-[16px] font-semibold text-white active:scale-[0.98]">Start timed answer</button>
        </section>
        <div className="flex flex-col gap-3">
          {last && (
            <div className="flex flex-col gap-1.5 rounded-[18px] bg-tint p-5">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-link">Feedback ready</span>
              <span className="font-display text-[40px] leading-none">{Math.round(last.score * 100)}<span className="text-[22px] text-muted"> / 100</span></span>
              <span className="text-[15px]">{last.course} · {last.title} · grade {grade(last.score)}</span>
            </div>
          )}
          <div className="px-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Or choose a course</div>
          {[...COURSES].sort((x, y) => x.examInDays - y.examInDays).map((c) => (
            <button key={c.code} type="button" onClick={() => setSheet({ course: c, format: "timed" })} className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-edge/10 bg-surface px-[18px] text-left text-[16px] text-ink hover:bg-hover">
              <span className="truncate">{c.course}</span><span className="shrink-0 text-[14px] text-faint">Exam in {c.examInDays} days · {dayName(today, c.examInDays)}</span>
            </button>
          ))}
          <p className="m-0 px-1 pt-1 text-[14px] text-faint">Your next exam: {next.course}, {dayName(today, next.examInDays)}.</p>
        </div>
      </div>

      {sheet && <SessionSheet init={sheet} onClose={() => setSheet(null)} onStart={start} />}
    </div>
  );
}

// ---- Setup sheet ------------------------------------------------------------------------------------------------------

function SessionSheet({ init, onClose, onStart }: { init: { course: MockCourse; format: Format }; onClose: () => void; onStart: (c: MockCourse, f: Format, s: Size) => void }) {
  const [course, setCourse] = useState(init.course);
  const [format, setFormat] = useState<Format>(init.format);
  const [size, setSize] = useState<Size>("standard");
  const n = Math.min(SIZES[size].questions, course.questions.length);
  const marks = course.questions.slice(0, n).reduce((t, q) => t + q.marks, 0);
  const go = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="New session">
      <div onClick={onClose} className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" style={{ animation: "tt-fade 0.25s ease-out" }} />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.25)] md:max-w-[480px] md:rounded-[28px]" style={{ animation: "tt-sheet 0.38s cubic-bezier(0.32, 0.72, 0, 1)" }}>
        <div aria-hidden className="mx-auto mt-2 h-[5px] w-9 shrink-0 rounded-full bg-faint/40 md:hidden" />
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2.5">
          <button type="button" onClick={onClose} className="justify-self-start border-0 bg-transparent text-[17px] text-link">Cancel</button>
          <h2 className="m-0 text-[17px] font-semibold">New session</h2>
          <span />
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          <Seg label="Format" value={format} onChange={setFormat} options={[["timed", "Timed mock"], ["practice", "Practice"]]} />
          <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
            <legend className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">Course</legend>
            <div role="radiogroup" className="overflow-hidden rounded-[14px] bg-surface shadow-card">
              {COURSES.map((c) => (
                <button key={c.code} type="button" role="radio" aria-checked={c.code === course.code} onClick={() => setCourse(c)} className="flex min-h-12 w-full items-center gap-3 border-0 border-t border-edge/[0.06] bg-transparent px-3.5 text-left first:border-0 hover:bg-hover">
                  <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{c.course}</span>
                  {c.code === course.code && <Tick />}
                </button>
              ))}
            </div>
          </fieldset>
          <Seg label={format === "timed" ? "Length" : "Questions"} value={size} onChange={setSize} options={(Object.keys(SIZES) as Size[]).map((k) => [k, format === "timed" ? `${SIZES[k].label} · ${SIZES[k].minutes < 60 ? `${SIZES[k].minutes} min` : `${SIZES[k].minutes / 60} hr`}` : `${Math.min(SIZES[k].questions, course.questions.length)}`])} />
          <p className="m-0 px-1 text-[13px] leading-snug text-muted">
            {n} {n === 1 ? "question" : "questions"} · {marks} marks · {format === "timed" ? `${SIZES[size].minutes} minutes on the clock` : "no clock"}. Marked with feedback when you finish.
          </p>
        </div>
        <div className="shrink-0 border-t border-edge/[0.08] bg-canvas/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <button ref={go} type="button" onClick={() => onStart(course, format, size)} className="h-[50px] w-full rounded-full border-0 bg-blue text-[17px] font-semibold text-white transition-transform active:scale-[0.98]">{format === "timed" ? "Start exam" : "Start practice"}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Exam room --------------------------------------------------------------------------------------------------------

function ExamRoom({ s, onExit, onSubmit }: { s: Session; onExit: () => void; onSubmit: (answers: string[], seconds: number) => void }) {
  const total = SIZES[s.size].minutes * 60;
  const timed = s.format === "timed";
  const [at, setAt] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => s.questions.map(() => ""));
  const [flags, setFlags] = useState<boolean[]>(() => s.questions.map(() => false));
  const [elapsed, setElapsed] = useState(0);
  const [confirm, setConfirm] = useState<"submit" | "exit" | null>(null);
  const latest = useRef({ answers, elapsed });
  useEffect(() => { latest.current = { answers, elapsed }; });

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Time up: hand in what is written.
  useEffect(() => {
    if (timed && elapsed >= total) onSubmit(latest.current.answers, total);
  }, [timed, elapsed, total, onSubmit]);

  const q = s.questions[at];
  const left = Math.max(0, total - elapsed);
  const w = words(answers[at]);
  const blank = answers.filter((a) => !words(a)).length;
  const last = at === s.questions.length - 1;
  const set = (v: string) => setAnswers((a) => a.map((x, i) => (i === at ? v : x)));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label={`${s.course.course} ${timed ? "mock exam" : "practice"}`}>
      <header className="shrink-0 border-b border-edge/[0.08] bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-[1100px] grid-cols-[1fr_auto_1fr] items-center px-3 py-2 md:px-6">
          <button type="button" onClick={() => setConfirm("exit")} className="h-10 justify-self-start border-0 bg-transparent px-2 text-[17px] text-link">Exit</button>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[15px] font-semibold">{s.course.code} · Question {at + 1} of {s.questions.length}</span>
            <span className="text-[12px] text-muted">{q.kind} · {q.marks} marks</span>
          </div>
          {timed ? (
            <span role="timer" aria-label={`${clock(left)} left`} className={`justify-self-end rounded-full px-3 py-1.5 text-[15px] font-semibold tabular-nums ${left < 60 ? "bg-red/15 text-red" : left < 600 ? "bg-[#C4552B]/20 text-[#b36b00]" : "bg-fill text-ink"}`}>{clock(left)}</span>
          ) : <span className="justify-self-end text-[13px] text-muted">No clock</span>}
        </div>
        <div className="mx-auto flex max-w-[1100px] gap-1.5 px-4 pb-2 md:px-6" role="tablist" aria-label="Questions">
          {s.questions.map((x, i) => (
            <button key={x.id} type="button" role="tab" aria-selected={i === at} aria-label={`Question ${i + 1}${words(answers[i]) ? ", answered" : ""}${flags[i] ? ", flagged" : ""}`} onClick={() => setAt(i)} className="group h-6 flex-1 border-0 bg-transparent p-0">
              <span className={`mt-2.5 block h-1 rounded-full transition-colors ${i === at ? "bg-blue" : words(answers[i]) ? "bg-blue/45" : "bg-track"} ${flags[i] ? "!bg-[#C4552B]" : ""}`} />
            </button>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto grid max-w-[1100px] gap-5 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:py-8">
          <article className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em]" style={{ color: s.course.color }}>{q.kind}</span>
            <p className="m-0 text-pretty text-[19px] leading-[1.45] tracking-[-0.01em] md:text-[21px]">{q.text}</p>
            <button type="button" aria-pressed={flags[at]} onClick={() => setFlags((f) => f.map((x, i) => (i === at ? !x : x)))} className={`mt-1 flex h-9 w-fit items-center gap-2 rounded-full border-0 px-3.5 text-[13px] font-medium ${flags[at] ? "bg-[#C4552B]/20 text-[#b36b00]" : "bg-fill text-ink"}`}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill={flags[at] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden><path d="M3.5 14V2.5h8l-1.5 3 1.5 3h-8" /></svg>
              {flags[at] ? "Flagged for review" : "Flag for review"}
            </button>
          </article>
          <section className="flex min-h-0 flex-col gap-2">
            <label htmlFor="answer" className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">Your answer</label>
            <textarea id="answer" value={answers[at]} onChange={(e) => set(e.target.value)} placeholder="Write your answer here. Identify the issue, state the rule, apply it, and conclude." spellCheck
              className="min-h-[300px] w-full resize-y rounded-[18px] border-0 bg-surface p-4 text-[16px] leading-[1.6] text-ink shadow-[0_0_0_0.5px_var(--hairline)] outline-none placeholder:text-faint focus:shadow-[0_0_0_2px_var(--color-blue)] md:min-h-[380px]" />
            <div className="flex items-center justify-between px-1 text-[12px] text-muted">
              <span className="tabular-nums">{w} {w === 1 ? "word" : "words"}</span>
              <span>Aim for about {q.marks * 10} words</span>
            </div>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-edge/[0.08] bg-canvas/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-3 md:px-6">
          <button type="button" disabled={at === 0} onClick={() => setAt(at - 1)} className="h-11 rounded-full border-0 bg-fill px-5 text-[15px] font-medium disabled:opacity-35">Previous</button>
          {last
            ? <button type="button" onClick={() => setConfirm("submit")} className="h-11 rounded-full border-0 bg-blue px-6 text-[15px] font-semibold text-white transition-transform active:scale-[0.97]">Hand in</button>
            : <button type="button" onClick={() => setAt(at + 1)} className="h-11 rounded-full border-0 bg-blue px-6 text-[15px] font-semibold text-white transition-transform active:scale-[0.97]">Next</button>}
        </div>
      </footer>

      {confirm && (
        <Alert
          title={confirm === "submit" ? "Hand in your paper?" : "Leave this session?"}
          body={confirm === "submit" ? (blank ? `${blank} ${blank === 1 ? "question is" : "questions are"} still blank. You cannot change your answers after handing in.` : "You cannot change your answers after handing in.") : "Your answers will be lost."}
          action={confirm === "submit" ? "Hand in" : "Leave"} danger={confirm === "exit"} keep={confirm === "submit" ? "Keep writing" : "Stay"}
          onAction={() => (confirm === "submit" ? onSubmit(answers, Math.min(elapsed, total)) : onExit())} onKeep={() => setConfirm(null)} />
      )}
    </div>
  );
}

/** An iOS-style alert: a centred card with two stacked or side-by-side actions. */
function Alert({ title, body, action, keep, danger, onAction, onKeep }: { title: string; body: string; action: string; keep: string; danger?: boolean; onAction: () => void; onKeep: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-6" role="alertdialog" aria-modal="true" aria-label={title}>
      <div onClick={onKeep} className="absolute inset-0 bg-black/40" style={{ animation: "tt-fade 0.2s ease-out" }} />
      <div className="relative w-full max-w-[300px] overflow-hidden rounded-[20px] bg-surface/95 text-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl" style={{ animation: "tt-pop 0.2s ease-out" }}>
        <div className="px-5 pb-4 pt-5">
          <h3 className="m-0 text-[17px] font-semibold">{title}</h3>
          <p className="m-0 mt-1.5 text-[13px] leading-snug text-muted">{body}</p>
        </div>
        <div className="grid grid-cols-2 border-t border-edge/10">
          <button type="button" onClick={onKeep} className="h-11 border-0 border-r border-edge/10 bg-transparent text-[17px] text-link">{keep}</button>
          <button type="button" onClick={onAction} className={`h-11 border-0 bg-transparent text-[17px] font-semibold ${danger ? "text-red" : "text-link"}`}>{action}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Results ----------------------------------------------------------------------------------------------------------

function Results({ r, onAgain, onDone }: { r: Result; onAgain: () => void; onDone: () => void }) {
  const { session: s } = r;
  const marks = s.questions.map((q, i) => markFor(q, r.answers[i]));
  const got = marks.reduce((a, b) => a + b, 0);
  const out = s.questions.reduce((a, q) => a + q.marks, 0);
  const pct = got / out;
  const [expert, setExpert] = useState(false);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-canvas" role="dialog" aria-modal="true" aria-label="Your results">
      <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:px-6 md:pt-8">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onDone} className="h-10 border-0 bg-transparent px-1 text-[17px] text-link">Done</button>
          <span className="rounded-full bg-fill px-3 py-1 text-xs font-medium text-muted">Sample marking</span>
        </div>

        <section className="flex flex-col items-center gap-4 rounded-[24px] bg-surface p-6 text-center shadow-card md:p-8">
          <Ring value={pct} size={148} stroke={13} color={pct >= 0.6 ? "#34C759" : pct >= 0.5 ? "#C4552B" : "#FF3B30"} label={`Score ${Math.round(pct * 100)} percent`} text={`${Math.round(pct * 100)}%`} />
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[26px] font-bold tracking-[-0.025em]">{pct >= 0.7 ? "Excellent work" : pct >= 0.6 ? "A solid answer" : pct >= 0.5 ? "A pass, with room to grow" : "Needs more work"}</h2>
            <p className="m-0 text-[14px] text-muted">{s.course.course} · Grade {grade(pct)} · {got} of {out} marks · {clock(r.seconds)} taken</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" onClick={onAgain} className="h-11 rounded-full border-0 bg-blue px-6 text-[15px] font-semibold text-white">Practise again</button>
            <Link href="/ai" className="flex h-11 items-center justify-center rounded-full bg-fill px-6 text-[15px] font-semibold text-ink no-underline">Ask Notified AI</Link>
          </div>
        </section>

        {s.questions.map((q, i) => (
          <article key={q.id} className="flex flex-col gap-4 rounded-[20px] bg-surface p-5 shadow-card">
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">Question {i + 1} · {q.kind}</span>
                <p className="m-0 mt-1 line-clamp-2 text-[15px] leading-snug">{q.text}</p>
              </div>
              <span className="shrink-0 rounded-[12px] bg-fill px-3 py-1.5 text-[15px] font-bold tabular-nums">{marks[i]}<span className="font-medium text-muted">/{q.marks}</span></span>
            </header>
            <div className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden><div className="h-full rounded-full" style={{ width: `${(marks[i] / q.marks) * 100}%`, background: marks[i] / q.marks >= 0.6 ? "#34C759" : "#C4552B" }} /></div>
            {words(r.answers[i]) < 15
              ? <Feedback tone="warn" title="To improve" items={["This answer is blank or too short to mark. Write at least a short answer: the issue, the rule, how it applies, and a conclusion."]} />
              : <><Feedback tone="good" title="What you did well" items={q.strengths} /><Feedback tone="warn" title="To improve" items={q.improve} /></>}
            <details className="group rounded-[14px] bg-fill/70">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                A strong answer covers
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-muted transition-transform group-open:rotate-180" aria-hidden><path d="m4 6 4 4 4-4" /></svg>
              </summary>
              <ol className="m-0 flex list-decimal flex-col gap-1.5 px-3.5 pb-3.5 pl-8 text-[14px] leading-snug">{q.outline.map((o) => <li key={o}>{o}</li>)}</ol>
            </details>
            <details className="group rounded-[14px] bg-fill/70">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                Your answer <span className="text-[12px] font-normal text-muted">{words(r.answers[i])} words</span>
              </summary>
              <p className="m-0 whitespace-pre-wrap px-3.5 pb-3.5 text-[14px] leading-[1.55] text-muted">{r.answers[i].trim() || "You left this blank."}</p>
            </details>
          </article>
        ))}

        <section className="flex flex-col items-start gap-3 rounded-[20px] bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="m-0 text-[16px] font-semibold">Want a lecturer&apos;s eye on it?</h3>
            <p className="m-0 mt-0.5 text-[13px] leading-snug text-muted">Request an expert review of this paper. Written feedback comes back within two days.</p>
          </div>
          <button type="button" disabled={expert} onClick={() => setExpert(true)} className="h-10 shrink-0 rounded-full border-0 bg-fill px-5 text-[14px] font-semibold disabled:text-green">{expert ? "Requested" : "Request review"}</button>
        </section>
      </div>
    </div>
  );
}

const Feedback = ({ tone, title, items }: { tone: "good" | "warn"; title: string; items: string[] }) => (
  <div className="flex flex-col gap-1.5">
    <h4 className="m-0 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.04em]" style={{ color: tone === "good" ? "var(--color-green)" : "#c77700" }}>
      <span aria-hidden className="size-2 rounded-full" style={{ background: tone === "good" ? "var(--color-green)" : "#C4552B" }} />{title}
    </h4>
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px] leading-snug">{items.map((t) => <li key={t}>{t}</li>)}</ul>
  </div>
);

// ---- Small pieces -----------------------------------------------------------------------------------------------------

function Seg<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
      <div role="radiogroup" aria-label={label} className="nl-type-fixed flex rounded-[10px] bg-[rgba(118,118,128,0.12)] p-0.5">
        {options.map(([k, text]) => (
          <button key={k} type="button" role="radio" aria-checked={k === value} onClick={() => onChange(k)}
            className={`min-h-9 flex-1 rounded-[8px] border-0 px-2 text-[13px] font-medium transition-all ${k === value ? "bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.15)]" : "bg-transparent text-ink"}`}>{text}</button>
        ))}
      </div>
    </div>
  );
}

/** A progress ring, drawn in over 0.9 s. `text` is shown in the middle (the percentage by default for large rings). */
function Ring({ value, size, stroke, color, label, text, small }: { value: number; size: number; stroke: number; color: string; label: string; text?: string; small?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span role="img" aria-label={label} className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value)}
          style={{ ["--c" as string]: c, animation: "nl-ring 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }} />
      </svg>
      <span className={`absolute font-bold tabular-nums tracking-[-0.02em] ${small ? "text-[13px]" : size > 120 ? "text-[34px]" : "text-[22px]"}`}>{text ?? `${Math.round(value * 100)}%`}</span>
    </span>
  );
}

const Tick = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-link" aria-hidden><path d="m3 8.5 3.2 3.2L13 4.5" /></svg>;
