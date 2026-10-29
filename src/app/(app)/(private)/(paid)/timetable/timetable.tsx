"use client";

import { useMemo, useState } from "react";
import { Btn, Page, Segmented, Title, cardCls } from "@/components/ui";
import {
  DEFAULT_INPUT, addDays, clash, daysBetween, toHhmm, toMins, todayIso,
  type StoredSession, type TimetableInput,
} from "@/lib/timetable";
import type { TimetableState } from "@/lib/timetable-db";
import { Dialogs, type Actions } from "./dialogs";
import { OFFLINE, colorOf, fmt, inDays, square, startOfWeek, type Ctx, type Dialog } from "./shared";
import { ListView, MonthView, WeekView } from "./views";

const VIEWS = ["Month", "Week", "List"] as const;
type View = (typeof VIEWS)[number];

type Json = { error?: string; input?: TimetableInput; session?: StoredSession; sessions?: StoredSession[]; added?: number };
async function call(url: string, method: string, body?: unknown): Promise<Json> {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as Json | null;
  if (!res?.ok) return { error: json?.error ?? OFFLINE };
  return json ?? {};
}
const byTime = (a: StoredSession, b: StoredSession) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);

/**
 * TimeTable: a private study calendar. Everything is made on the calendar itself: exams, weekly free time and
 * study sessions are added by tapping or dragging on it, moved by dragging, and changed by tapping. "Plan my
 * sessions" fills the free time before each exam. Every change saves at once and is undone if the save fails.
 */
export function Timetable({ initial, suggestions }: { initial: TimetableState | null; suggestions: string[] }) {
  const today = todayIso();
  const [input, setInput] = useState(initial?.input ?? DEFAULT_INPUT);
  const [sessions, setSessions] = useState(initial?.sessions ?? []);
  const [view, setView] = useState<View>("Week");
  const [cursor, setCursor] = useState(today);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  async function saveInput(next: TimetableInput) {
    const [prevInput, prevSessions] = [input, sessions];
    const ids = new Set(next.courses.map((c) => c.id));
    setInput(next);
    setSessions((all) => all.filter((s) => ids.has(s.courseId)));
    const r = await call("/api/timetable", "PUT", next);
    if (!r.error) return null;
    setInput(prevInput);
    setSessions(prevSessions);
    return r.error;
  }

  async function addSession(f: Pick<StoredSession, "courseId" | "date" | "start" | "end">) {
    if (clash(f, sessions)) return "That overlaps another session.";
    const r = await call("/api/timetable/sessions", "POST", f);
    if (r.error || !r.session) return r.error ?? OFFLINE;
    setSessions((all) => [...all, r.session!].sort(byTime));
    return null;
  }

  /** Changes a session, showing the change at once and undoing it if the save fails. */
  async function updateSession(s: StoredSession, f: Pick<StoredSession, "courseId" | "date" | "start" | "end">) {
    const next = { ...s, ...f, auto: false };
    if (clash(next, sessions)) return "That overlaps another session.";
    setSessions((all) => all.map((o) => (o.id === s.id ? next : o)).sort(byTime));
    const r = await call(`/api/timetable/sessions/${s.id}`, "PATCH", f);
    if (!r.error) return null;
    setSessions((all) => all.map((o) => (o.id === s.id ? s : o)).sort(byTime));
    return r.error;
  }

  async function deleteSession(s: StoredSession) {
    const r = await call(`/api/timetable/sessions/${s.id}`, "DELETE");
    if (r.error) return r.error;
    setSessions((all) => all.filter((o) => o.id !== s.id));
    return null;
  }

  async function plan(sessionMins: number, breakMins: number) {
    if (sessionMins !== input.sessionMins || breakMins !== input.breakMins) {
      const e = await saveInput({ ...input, sessionMins, breakMins });
      if (e) return e;
    }
    const r = await call("/api/timetable/plan", "POST");
    if (r.error || !r.sessions) return r.error ?? OFFLINE;
    setSessions(r.sessions);
    setNotice(r.added ? `Planned ${r.added} study session${r.added === 1 ? "" : "s"}. Drag or tap any of them to change it.` : "No free time was left before your exams, so nothing new was planned.");
    return null;
  }

  async function clearAll() {
    const r = await call("/api/timetable", "DELETE");
    setConfirmClear(false);
    if (r.error) return setError(r.error);
    setInput(DEFAULT_INPUT);
    setSessions([]);
  }

  /** For drags: report a refused change above the calendar rather than in a dialog. */
  const report = async (p: Promise<string | null>) => { setError(""); setNotice(""); const e = await p; if (e) setError(e); return e; };

  const actions: Actions = { saveInput, addSession, updateSession, deleteSession, plan };
  const ctx: Ctx = {
    input, sessions, today,
    open: (d) => { setError(""); setDialog(d); },
    moveSession: (s, date, startMins, endMins) => {
      const len = (endMins ?? startMins + toMins(s.end) - toMins(s.start)) - startMins;
      const at = Math.max(0, Math.min(24 * 60 - len, startMins));
      if (date === s.date && at === toMins(s.start) && at + len === toMins(s.end)) return Promise.resolve(null);
      return report(updateSession(s, { courseId: s.courseId, date, start: toHhmm(at), end: toHhmm(at + len) }));
    },
    moveExam: (courseId, date, time) => {
      const c = input.courses.find((o) => o.id === courseId);
      if (!c || (c.examDate === date && (time === undefined || time === c.examTime))) return Promise.resolve(null);
      return report(saveInput({ ...input, courses: input.courses.map((o) => (o.id === courseId ? { ...o, examDate: date, examTime: time ?? o.examTime } : o)) }));
    },
  };

  const shift = (n: number) => setCursor((c) => {
    if (view === "Week") return addDays(c, 7 * n);
    const d = new Date(Date.parse(c));
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 10);
  });
  const weekStart = startOfWeek(cursor);
  const heading = view === "Month" ? fmt(cursor, { month: "long", year: "numeric" })
    : `${fmt(weekStart, { day: "numeric", month: "short" })} – ${fmt(addDays(weekStart, 6), { day: "numeric", month: "short", year: "numeric" })}`;
  const hasExam = input.courses.some((c) => c.examDate && c.examDate > today);
  const hasPlan = sessions.some((s) => s.auto && s.date >= today);
  const steps = useMemo(() => [
    { done: hasExam, title: "Put your exams on the calendar", hint: "Tap a day, or drag over a time, and choose Exam." },
    { done: input.free.length > 0, title: "Mark when you're free", hint: "In Week view, drag over the hours you can study and choose Free time. It repeats every week." },
    { done: hasPlan, title: "Plan my sessions", hint: "We fill your free time with study sessions up to each exam. Move or change any of them after." },
  ], [hasExam, input.free.length, hasPlan]);

  return (
    <Page max={1200}>
      <Title
        title="TimeTable"
        sub="Tap or drag on the calendar to add exams, free time and study sessions. Drag to move them, tap to change them. Only you can see this."
        right={<Btn onClick={() => ctx.open({ mode: "plan" })}>Plan my sessions</Btn>}
      />

      {!steps.every((s) => s.done) && (
        <ol className={`${cardCls} m-0 grid list-none grid-cols-1 gap-4 p-5 md:grid-cols-3`}>
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${s.done ? "bg-green text-white" : "bg-fill text-muted"}`} aria-label={s.done ? "Done" : `Step ${i + 1}`}>{s.done ? "✓" : i + 1}</span>
              <div className="min-w-0">
                <div className={`text-[14px] font-semibold ${s.done ? "text-muted line-through" : ""}`}>{s.title}</div>
                {!s.done && <div className="text-[12px] leading-snug text-muted">{s.hint}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-2" aria-label="Courses">
        {input.courses.map((c) => (
          <button key={c.id} type="button" onClick={() => ctx.open({ mode: "course", courseId: c.id })}
            className="flex h-8 items-center gap-2 rounded-full bg-surface px-3 text-[13px] shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill">
            <span className="size-2.5 rounded-full" style={{ background: colorOf(input.courses, c.id) }} aria-hidden />
            <span className="font-medium">{c.name}</span>
            <span className="text-muted">{c.examDate ? `exam ${inDays(daysBetween(today, c.examDate)).toLowerCase()}` : "no exam yet"}</span>
          </button>
        ))}
        <button type="button" onClick={() => ctx.open({ mode: "course", courseId: null })} className="h-8 rounded-full px-3 text-[13px] font-medium text-blue hover:bg-fill">+ Add course</button>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-[220px]"><Segmented options={VIEWS} value={view} onChange={setView} /></div>
          {view !== "List" && (
            <div className="flex items-center gap-2">
              <span className="mr-1 text-[15px] font-semibold" aria-live="polite">{heading}</span>
              <button type="button" onClick={() => shift(-1)} aria-label={`Previous ${view.toLowerCase()}`} className={square}>‹</button>
              <Btn tone="plain" onClick={() => setCursor(today)}>Today</Btn>
              <button type="button" onClick={() => shift(1)} aria-label={`Next ${view.toLowerCase()}`} className={square}>›</button>
            </div>
          )}
        </div>
        {error && <p className="m-0 text-[13px] text-red" role="alert">{error}</p>}
        {notice && <p className="m-0 text-[13px] text-muted" role="status">{notice}</p>}
        {view === "Month" && <MonthView ctx={ctx} cursor={cursor} onDay={(d) => { setCursor(d); setView("Week"); }} />}
        {view === "Week" && <WeekView ctx={ctx} start={weekStart} />}
        {view === "List" && <ListView ctx={ctx} />}
      </section>

      {(input.courses.length > 0 || input.free.length > 0 || sessions.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {confirmClear ? (
            <>
              <span className="text-[13px] text-muted">Remove every course, exam, free time and session?</span>
              <Btn tone="dark" onClick={clearAll}>Clear TimeTable</Btn>
              <Btn tone="plain" onClick={() => setConfirmClear(false)}>Keep</Btn>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="h-8 rounded-[7px] px-2 text-[13px] text-muted hover:bg-fill">Clear TimeTable…</button>
          )}
        </div>
      )}

      {dialog && <Dialogs dialog={dialog} input={input} sessions={sessions} today={today} suggestions={suggestions} actions={actions} close={() => setDialog(null)} />}
    </Page>
  );
}
