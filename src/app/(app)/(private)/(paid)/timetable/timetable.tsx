"use client";

import { useEffect, useState } from "react";
import { Segmented } from "@/components/ui";
import {
  DEFAULT_INPUT, addDays, clash, daysBetween, toHhmm, toMins, todayIso,
  type StoredSession, type TimetableInput,
} from "@/lib/timetable";
import type { TimetableState } from "@/lib/timetable-db";
import { Dialogs, type Actions } from "./dialogs";
import { EXAM_COLOR, OFFLINE, anchorOf, colorOf, fmt, inDays, startOfWeek, type Anchor, type Ctx, type Dialog } from "./shared";
import { ListView, MiniMonth, MonthView, WeekView } from "./views";

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
type Toast = { text: string; tone: "error" | "info" };

/**
 * TimeTable: a private study calendar, laid out like a desktop calendar app. On larger screens it fills the window:
 * a sidebar with a small month and the course list (each course can be shown or hidden), beside
 * the calendar. Everything is made on the calendar itself: exams, weekly free time and study sessions are added by
 * clicking or dragging, moved by dragging, and changed in a popover beside them. Every change saves at once and is undone if the save fails.
 */
export function Timetable({ initial, suggestions }: { initial: TimetableState | null; suggestions: string[] }) {
  const today = todayIso();
  const [input, setInput] = useState(initial?.input ?? DEFAULT_INPUT);
  const [sessions, setSessions] = useState(initial?.sessions ?? []);
  const [view, setView] = useState<View>("Week");
  const [cursor, setCursor] = useState(today);
  const [open, setOpen] = useState<{ dialog: Dialog; anchor?: Anchor } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tone === "error" ? 6000 : 4500);
    return () => clearTimeout(t);
  }, [toast]);

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

  async function clearAll() {
    const r = await call("/api/timetable", "DELETE");
    setConfirmClear(false);
    if (r.error) return setToast({ tone: "error", text: r.error });
    setInput(DEFAULT_INPUT);
    setSessions([]);
  }

  /** For drags: a refused change shows as a toast rather than in a popover. */
  const report = async (p: Promise<string | null>) => { const e = await p; if (e) setToast({ tone: "error", text: e }); return e; };

  const actions: Actions = { saveInput, addSession, updateSession, deleteSession };
  const ctx: Ctx = {
    input, sessions, today, hidden,
    active: open?.dialog ?? null,
    open: (dialog, anchor) => { setToast(null); setOpen({ dialog, anchor }); },
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
  const toggle = (id: string) => setHidden((h) => { const n = new Set(h); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const weekStart = startOfWeek(cursor);
  // A week across two months is titled by both, as calendars do.
  const end = addDays(weekStart, 6);
  const month = view === "Week" && end.slice(0, 7) !== weekStart.slice(0, 7)
    ? `${fmt(weekStart, { month: "short" })} – ${fmt(end, { month: "short" })}` : fmt(view === "Week" ? weekStart : cursor, { month: "long" });
  const year = fmt(view === "Week" ? end : cursor, { year: "numeric" });
  const marked = new Set([...sessions.filter((s) => !hidden.has(s.courseId)).map((s) => s.date), ...input.courses.filter((c) => c.examDate && !hidden.has(c.id)).map((c) => c.examDate)]);

  const hasExam = input.courses.some((c) => c.examDate && c.examDate > today);
  const steps = [
    { done: hasExam, title: "Add your exams", hint: "Click a day, or drag over a time, and choose Exam." },
    { done: input.free.length > 0, title: "Mark when you're free", hint: "In Week, drag over the hours you can study and choose Free time. It repeats weekly." },
  ];
  const next = steps.findIndex((s) => !s.done);
  const any = input.courses.length > 0 || input.free.length > 0 || sessions.length > 0;
  const openFrom = (d: Dialog) => (e: React.MouseEvent) => ctx.open(d, anchorOf(e.currentTarget));

  const courseRow = (c: TimetableInput["courses"][number]) => {
    const color = colorOf(input.courses, c.id);
    const off = hidden.has(c.id);
    return (
      <li key={c.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-fill">
        <button type="button" role="checkbox" aria-checked={!off} aria-label={`Show ${c.name}`} onClick={() => toggle(c.id)}
          className="flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]" style={{ borderColor: color, background: off ? "transparent" : color }}>
          {!off && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m2.5 6.2 2.3 2.3 4.7-5" /></svg>}
        </button>
        <button type="button" onClick={openFrom({ mode: "course", courseId: c.id })} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-[13px] ${off ? "text-muted" : ""}`}>{c.name}</span>
          <span className="block truncate text-[11px] text-muted">{c.examDate ? `Exam ${inDays(daysBetween(today, c.examDate)).toLowerCase()}` : "No exam yet"}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 pt-4 md:h-full md:flex-row md:gap-0 md:p-0">
      <aside className="hidden w-[236px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-edge/[0.08] bg-surface/60 px-3 py-4 lg:flex" aria-label="TimeTable">
        <MiniMonth cursor={cursor} today={today} marked={marked} onPick={setCursor} />
        <section className="flex flex-col gap-1">
          <div className="flex items-center justify-between px-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Courses</span>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {input.courses.map(courseRow)}
            {!input.courses.length && <li className="px-1.5 py-1 text-[12px] text-muted">Add a course, or put an exam on the calendar.</li>}
            <li className="mt-0.5 flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-fill">
              <span className="w-[15px] text-center text-[15px] leading-none text-blue" aria-hidden>+</span>
              <span className="flex-1">
                <button type="button" onClick={openFrom({ mode: "course", courseId: null })} className="text-[13px] text-blue">Add course</button>
              </span>
            </li>
            <li className="flex items-center gap-2 px-1.5 py-1 text-[12px] text-muted">
              <span className="size-[9px] rounded-full" style={{ background: EXAM_COLOR }} aria-hidden />Exams always show in red
            </li>
          </ul>
        </section>
        {next >= 0 && (
          <ol className="m-0 flex list-none flex-col gap-2.5 rounded-[10px] bg-fill p-3" aria-label="Getting started">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-2">
                <span className={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${s.done ? "bg-green text-white" : i === next ? "bg-blue text-white" : "bg-track text-muted"}`} aria-label={s.done ? "Done" : `Step ${i + 1}`}>{s.done ? "✓" : i + 1}</span>
                <div className="min-w-0">
                  <div className={`text-[12px] font-semibold ${s.done ? "text-muted line-through" : ""}`}>{s.title}</div>
                  {i === next && <div className="text-[11px] leading-snug text-muted">{s.hint}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <span className="flex-1" />
        {any && <ClearAll confirm={confirmClear} setConfirm={setConfirmClear} clear={clearAll} />}
        <p className="m-0 px-1.5 text-[11px] leading-snug text-faint">Only you can see your TimeTable.</p>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 md:px-5 md:pb-5 md:pt-4" aria-label="Calendar">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="m-0 min-w-0 flex-1 basis-full truncate sm:basis-auto text-[22px] font-bold tracking-[-0.02em] md:text-[26px]" aria-live="polite">
            {view === "List" ? "Upcoming" : <>{month} <span className="font-normal text-muted">{year}</span></>}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-[200px]"><Segmented options={VIEWS} value={view} onChange={setView} /></div>
            {view !== "List" && (
              <div className="flex h-8 items-center overflow-hidden rounded-[8px] bg-surface shadow-[0_0_0_0.5px_var(--hairline),0_1px_2px_rgba(0,0,0,0.05)]">
                <button type="button" onClick={() => shift(-1)} aria-label={`Previous ${view.toLowerCase()}`} className="flex h-full w-8 items-center justify-center text-[17px] text-muted hover:bg-fill">‹</button>
                <button type="button" onClick={() => setCursor(today)} className="h-full border-x border-edge/[0.08] px-3 text-[13px] font-medium hover:bg-fill">Today</button>
                <button type="button" onClick={() => shift(1)} aria-label={`Next ${view.toLowerCase()}`} className="flex h-full w-8 items-center justify-center text-[17px] text-muted hover:bg-fill">›</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:hidden">
          <div className="scroll-row flex flex-wrap items-center gap-2" aria-label="Courses">
            {input.courses.map((c) => {
              const off = hidden.has(c.id);
              return (
                <button key={c.id} type="button" onClick={openFrom({ mode: "course", courseId: c.id })}
                  className={`flex h-8 shrink-0 items-center gap-2 rounded-full bg-surface px-3 text-[13px] shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill ${off ? "text-muted" : ""}`}>
                  <span className="size-2.5 rounded-full" style={{ background: colorOf(input.courses, c.id), opacity: off ? 0.35 : 1 }} aria-hidden />
                  {c.name}
                </button>
              );
            })}
            <button type="button" onClick={openFrom({ mode: "course", courseId: null })} className="h-8 shrink-0 rounded-full px-3 text-[13px] font-medium text-blue hover:bg-fill">+ Course</button>
          </div>
          {next >= 0 && (
            <p className="m-0 flex items-start gap-2 rounded-[10px] bg-surface px-3 py-2 text-[12px] leading-snug shadow-[0_0_0_0.5px_var(--hairline)]">
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-blue text-[10px] font-bold text-white">{next + 1}</span>
              <span><b className="font-semibold">{steps[next].title}.</b> <span className="text-muted">{steps[next].hint}</span></span>
            </p>
          )}
        </div>

        {view === "Month" && <MonthView ctx={ctx} cursor={cursor} onDay={(d) => { setCursor(d); setView("Week"); }} />}
        {view === "Week" && <WeekView ctx={ctx} start={weekStart} />}
        {view === "List" && <ListView ctx={ctx} />}

        {any && <div className="lg:hidden"><ClearAll confirm={confirmClear} setConfirm={setConfirmClear} clear={clearAll} /></div>}
      </section>

      {toast && (
        <div role={toast.tone === "error" ? "alert" : "status"}
          className="fixed bottom-6 left-1/2 z-[70] flex max-w-[min(480px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-full bg-[#1c1c1e]/90 py-2 pl-4 pr-2 text-[13px] text-white shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl animate-[tt-pop_160ms_ease-out]">
          {toast.tone === "error" && <span className="size-2 shrink-0 rounded-full bg-red" aria-hidden />}
          <span className="min-w-0">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="flex size-6 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10">×</button>
        </div>
      )}

      {open && <Dialogs dialog={open.dialog} anchor={open.anchor} input={input} sessions={sessions} today={today} suggestions={suggestions} actions={actions} close={() => setOpen(null)} />}
    </div>
  );
}

function ClearAll({ confirm, setConfirm, clear }: { confirm: boolean; setConfirm: (v: boolean) => void; clear: () => void }) {
  return confirm ? (
    <div className="flex flex-col gap-2 rounded-[10px] bg-red/10 p-2.5 text-[12px]">
      <span>Remove every course, exam, free time and session?</span>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="h-7 rounded-full bg-red px-3 font-semibold text-white">Clear all</button>
        <button type="button" onClick={() => setConfirm(false)} className="h-7 rounded-full px-3 text-blue hover:bg-fill">Keep</button>
      </div>
    </div>
  ) : (
    <button type="button" onClick={() => setConfirm(true)} className="self-start rounded-md px-1.5 py-1 text-[12px] text-muted hover:bg-fill">Clear TimeTable…</button>
  );
}
