"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Btn, Empty, Eyebrow, Page, Segmented, Title, cardCls } from "@/components/ui";
import {
  COURSE_COLORS, MAX_SESSION_MINS, MIN_SESSION_MINS, WEEKDAYS,
  addDays, clash, cleanSession, daysBetween, minutesByCourse, toHhmm, toMins, todayIso, weekday,
  type StoredSession, type TimetableCourse,
} from "@/lib/timetable";
import type { TimetableState } from "@/lib/timetable-db";
import { OFFLINE, field, hours, label } from "./shared";

const VIEWS = ["Month", "Week", "List"] as const;
type View = (typeof VIEWS)[number];
const SNAP = 15; // minutes a dragged or tapped time snaps to
const PX_PER_MIN = 1; // week view: an hour is 60px tall
const STEP = 14; // list view: days shown per "Show more"
const LENGTHS = Array.from({ length: (MAX_SESSION_MINS - MIN_SESSION_MINS) / 15 + 1 }, (_, i) => MIN_SESSION_MINS + i * 15);

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(Date.parse(iso)));
const dayLabel = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" });
const longDate = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const inDays = (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`);
const startOfWeek = (iso: string) => addDays(iso, -weekday(iso));
const snap = (m: number) => Math.round(m / SNAP) * SNAP;
const square = "inline-flex size-8 items-center justify-center rounded-[7px] bg-surface text-[17px] text-ink shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill";
const byTime = (a: StoredSession, b: StoredSession) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start);

type Draft = { id?: string; courseId: string; date: string; start: string; len: number };
type Result = { session?: StoredSession; error?: string };

async function call(url: string, method: string, body?: unknown): Promise<Result> {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const json = (await res?.json().catch(() => null)) as Result | null;
  if (!res?.ok) return { error: json?.error ?? OFFLINE };
  return json ?? {};
}

/**
 * The saved plan on a calendar. Month, week and list views; sessions can be dragged to another day (month) or
 * day and time (week), tapped to change or delete, and empty space tapped to add one. Every change is saved
 * straight away, shown first and rolled back if the server refuses it.
 */
export function Calendar({ state, setSessions, onEdit, onDeleted }: {
  state: TimetableState;
  setSessions: (f: (s: StoredSession[]) => StoredSession[]) => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { input, sessions } = state;
  const today = todayIso();
  const [view, setView] = useState<View>("Week");
  const [cursor, setCursor] = useState(today);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const color = useMemo(() => new Map(input.courses.map((c, i) => [c.id, COURSE_COLORS[i % COURSE_COLORS.length]])), [input.courses]);
  const course = useMemo(() => new Map(input.courses.map((c) => [c.id, c])), [input.courses]);
  const upcoming = input.courses.filter((c) => c.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const minutes = useMemo(() => minutesByCourse(sessions.filter((s) => s.date >= today)), [sessions, today]);
  const ctx: Ctx = { sessions, input, color, course, today, open: setDraft, move };

  /** Moves a session, saving it; the calendar shows the move at once and undoes it if the save fails. */
  async function move(s: StoredSession, date: string, start: number) {
    const len = toMins(s.end) - toMins(s.start);
    const at = Math.max(0, Math.min(24 * 60 - len, start));
    const next = { ...s, date, start: toHhmm(at), end: toHhmm(at + len) };
    if (next.date === s.date && next.start === s.start) return;
    if (clash(next, sessions)) return setError("That overlaps another session.");
    setError("");
    setSessions((all) => all.map((o) => (o.id === s.id ? next : o)));
    const r = await call(`/api/timetable/sessions/${s.id}`, "PATCH", { date: next.date, start: next.start, end: next.end });
    if (r.error) {
      setError(r.error);
      setSessions((all) => all.map((o) => (o.id === s.id ? s : o)));
    }
  }

  async function removeAll() {
    setError("");
    const r = await call("/api/timetable", "DELETE");
    if (r.error) return setError(r.error);
    onDeleted();
  }

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

  // Full width on phones, so the intro line keeps its own row instead of being squeezed beside the buttons.
  const actions = (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
      <Btn onClick={() => setDraft({ courseId: (upcoming[0] ?? input.courses[0]).id, date: cursor < today ? today : cursor, start: input.startTime, len: input.sessionMins })}>Add session</Btn>
      <Btn tone="plain" onClick={onEdit}>Edit setup</Btn>
      {confirm ? (
        <>
          <Btn tone="dark" onClick={removeAll}>Delete timetable</Btn>
          <Btn tone="plain" onClick={() => setConfirm(false)}>Keep</Btn>
        </>
      ) : (
        <Btn tone="plain" onClick={() => setConfirm(true)}>Delete</Btn>
      )}
    </div>
  );

  return (
    <Page max={1100}>
      <Title title="TimeTable" sub="Drag a session to move it, tap it to change it, or tap an empty spot to add one. Only you can see this." right={actions} />
      {upcoming.length > 0 && (
        <section className={`${cardCls} flex flex-col p-5`}>
          <Eyebrow>Exams</Eyebrow>
          <ul className="m-0 mt-2 grid list-none grid-cols-1 gap-x-6 p-0 md:grid-cols-2">
            {upcoming.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-t border-edge/[0.06] py-2.5 first:border-0 md:[&:nth-child(2)]:border-0">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: color.get(c.id) }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{c.name}</div>
                  <div className="text-xs text-muted">{longDate(c.examDate)}{c.examTime && ` at ${c.examTime}`} · {hours(minutes.get(c.id) ?? 0)} planned</div>
                </div>
                <span className="shrink-0 text-[13px] font-medium text-muted">{inDays(daysBetween(today, c.examDate))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!upcoming.length && !sessions.some((s) => s.date >= today) && (
        <Empty title="All your exams are behind you">Edit the setup to add your next exams, or add sessions yourself.</Empty>
      )}

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
        {view === "Month" && <MonthView ctx={ctx} cursor={cursor} onDay={(d) => { setCursor(d); setView("Week"); }} />}
        {view === "Week" && <WeekView ctx={ctx} start={weekStart} />}
        {view === "List" && <ListView ctx={ctx} />}
      </section>

      {draft && (
        <SessionDialog
          draft={draft}
          courses={input.courses}
          sessions={sessions}
          onClose={() => setDraft(null)}
          onSaved={(s, isNew) => { setSessions((all) => (isNew ? [...all, s] : all.map((o) => (o.id === s.id ? s : o))).sort(byTime)); setDraft(null); }}
          onDeleted={(id) => { setSessions((all) => all.filter((o) => o.id !== id)); setDraft(null); }}
        />
      )}
    </Page>
  );
}

type Ctx = {
  sessions: StoredSession[];
  input: TimetableState["input"];
  color: Map<string, string>;
  course: Map<string, TimetableCourse>;
  today: string;
  open: (d: Draft) => void;
  move: (s: StoredSession, date: string, start: number) => void;
};

const draftOf = (s: StoredSession): Draft => ({ id: s.id, courseId: s.courseId, date: s.date, start: s.start, len: toMins(s.end) - toMins(s.start) });
const examsOn = (ctx: Ctx, date: string) => ctx.input.courses.filter((c) => c.examDate === date);
const DRAG_TYPE = "text/x-timetable-session";

function MonthView({ ctx, cursor, onDay }: { ctx: Ctx; cursor: string; onDay: (d: string) => void }) {
  const first = `${cursor.slice(0, 7)}-01`;
  const start = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const [over, setOver] = useState<string | null>(null);
  return (
    <div className={`${cardCls} overflow-hidden`}>
      <div className="grid grid-cols-7 border-b border-edge/[0.08] text-center text-[11px] font-semibold uppercase text-muted">
        {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const mine = ctx.sessions.filter((s) => s.date === d);
          const exams = examsOn(ctx, d);
          const outside = d.slice(0, 7) !== cursor.slice(0, 7);
          return (
            <div
              key={d}
              onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(d); } }}
              onDragLeave={() => setOver((o) => (o === d ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const s = ctx.sessions.find((o) => o.id === e.dataTransfer.getData(DRAG_TYPE));
                if (s) ctx.move(s, d, toMins(s.start));
              }}
              className={`flex min-h-[64px] min-w-0 flex-col gap-0.5 border-b border-r border-edge/[0.06] p-1 sm:min-h-[104px] [&:nth-child(7n)]:border-r-0 ${outside ? "bg-fill/40" : ""} ${over === d ? "bg-blue/10" : ""}`}
            >
              <button type="button" onClick={() => onDay(d)} aria-label={`Open the week of ${longDate(d)}`}
                className={`flex size-6 items-center justify-center self-start rounded-full text-[12px] font-semibold ${d === ctx.today ? "bg-blue text-white" : outside ? "text-faint" : "text-ink"}`}>
                {Number(d.slice(8))}
              </button>
              {exams.map((c) => (
                <span key={c.id} className="truncate rounded bg-[rgba(255,59,48,0.12)] px-1 text-[10px] font-semibold text-red sm:text-[11px]">{c.name} exam</span>
              ))}
              {/* Phones: one dot per session; tapping the day opens its week. */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {mine.map((s) => <span key={s.id} className="size-1.5 rounded-full" style={{ background: ctx.color.get(s.courseId) }} />)}
              </div>
              <div className="hidden flex-col gap-0.5 sm:flex">
                {mine.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData(DRAG_TYPE, s.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={() => ctx.open(draftOf(s))}
                    className="flex min-w-0 cursor-grab items-center gap-1 rounded px-1 text-left text-[11px] hover:bg-fill active:cursor-grabbing"
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: ctx.color.get(s.courseId) }} aria-hidden />
                    <span className="shrink-0 tabular-nums text-muted">{s.start}</span>
                    <span className="truncate">{ctx.course.get(s.courseId)?.name}</span>
                  </button>
                ))}
                {mine.length > 3 && (
                  <button type="button" onClick={() => onDay(d)} className="self-start px-1 text-[11px] font-medium text-blue">+{mine.length - 3} more</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ ctx, start }: { ctx: Ctx; start: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const week = ctx.sessions.filter((s) => s.date >= days[0] && s.date <= days[6]);
  // Show from the earliest to the latest thing this week, at least eight hours from the usual start time.
  const from = Math.floor(Math.min(toMins(ctx.input.startTime), ...week.map((s) => toMins(s.start))) / 60) * 60;
  const to = Math.min(24 * 60, Math.max(from + 8 * 60, Math.ceil(Math.max(...week.map((s) => toMins(s.end)), 0) / 60) * 60));
  const grab = useRef(0); // minutes between the session's top and the point it was picked up by
  const [over, setOver] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // Phones see about three days at a time: open the week scrolled to today rather than to Monday.
  useEffect(() => {
    const el = scroller.current;
    const col = el?.querySelector<HTMLElement>(`[data-day="${ctx.today}"]`);
    if (el && col) el.scrollLeft += col.getBoundingClientRect().left - el.getBoundingClientRect().left - 52; // 52: the hours column
  }, [start, ctx.today]);
  const minuteAt = (e: React.MouseEvent | React.DragEvent) => from + (e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_MIN;

  return (
    <div ref={scroller} className={`${cardCls} overflow-x-auto`}>
      <div className="grid min-w-[760px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
        <div className="sticky left-0 z-10 border-b border-edge/[0.08] bg-surface" />
        {days.map((d) => (
          <div key={d} data-day={d} className="flex min-w-0 flex-col gap-1 border-b border-l border-edge/[0.08] p-2">
            <span className={`text-[12px] font-semibold ${d === ctx.today ? "text-blue" : ""}`}>{dayLabel(d)}</span>
            {examsOn(ctx, d).map((c) => (
              <span key={c.id} className="truncate rounded bg-[rgba(255,59,48,0.12)] px-1.5 py-0.5 text-[11px] font-semibold text-red" title={`${c.name} exam`}>
                {c.examTime && `${c.examTime} `}{c.name} exam
              </span>
            ))}
          </div>
        ))}
        <div className="sticky left-0 z-10 bg-surface" style={{ height: (to - from) * PX_PER_MIN }}>
          {Array.from({ length: (to - from) / 60 }, (_, i) => (
            <span key={i} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-faint first:translate-y-0" style={{ top: i * 60 * PX_PER_MIN }}>{toHhmm(from + i * 60)}</span>
          ))}
        </div>
        {days.map((d) => (
          <div
            key={d}
            role="presentation"
            onClick={(e) => {
              // The half hour that was tapped, kept inside the day.
              const at = Math.min(24 * 60 - ctx.input.sessionMins, Math.floor(minuteAt(e) / 30) * 30);
              ctx.open({ courseId: (ctx.input.courses.find((c) => c.examDate > d) ?? ctx.input.courses[0]).id, date: d, start: toHhmm(Math.max(0, at)), len: ctx.input.sessionMins });
            }}
            onDragOver={(e) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setOver(d); } }}
            onDragLeave={() => setOver((o) => (o === d ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const s = ctx.sessions.find((o) => o.id === e.dataTransfer.getData(DRAG_TYPE));
              if (s) ctx.move(s, d, snap(minuteAt(e) - grab.current));
            }}
            className={`relative cursor-copy border-l border-edge/[0.08] ${d === ctx.today ? "bg-blue/[0.03]" : ""} ${over === d ? "bg-blue/10" : ""}`}
            style={{ height: (to - from) * PX_PER_MIN, backgroundImage: "repeating-linear-gradient(to bottom, var(--hairline) 0 1px, transparent 1px 60px)" }}
          >
            {week.filter((s) => s.date === d).map((s) => {
              const top = (toMins(s.start) - from) * PX_PER_MIN;
              const height = (toMins(s.end) - toMins(s.start)) * PX_PER_MIN;
              const c = ctx.color.get(s.courseId);
              return (
                <button
                  key={s.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    grab.current = (e.clientY - e.currentTarget.getBoundingClientRect().top) / PX_PER_MIN;
                    e.dataTransfer.setData(DRAG_TYPE, s.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={(e) => { e.stopPropagation(); ctx.open(draftOf(s)); }}
                  className="absolute inset-x-1 flex cursor-grab flex-col overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight text-ink active:cursor-grabbing"
                  style={{ top: top + 1, height: height - 2, background: `color-mix(in srgb, ${c} 18%, var(--surface))`, borderLeft: `3px solid ${c}` }}
                >
                  <span className="truncate font-semibold">{ctx.course.get(s.courseId)?.name}</span>
                  {height >= 36 && <span className="tabular-nums text-muted">{s.start}–{s.end}</span>}
                  {s.review && height >= 50 && <span className="font-semibold text-muted">Final review</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({ ctx }: { ctx: Ctx }) {
  const [shown, setShown] = useState(STEP);
  const last = [...ctx.sessions.map((s) => s.date), ...ctx.input.courses.map((c) => c.examDate)].reduce((m, d) => (d > m ? d : m), ctx.today);
  const days = Array.from({ length: daysBetween(ctx.today, last) + 1 }, (_, i) => addDays(ctx.today, i));
  return (
    <div className="flex flex-col gap-3">
      {days.slice(0, shown).map((d) => {
        const mine = ctx.sessions.filter((s) => s.date === d);
        const exams = examsOn(ctx, d);
        return (
          <div key={d} className={`${cardCls} flex flex-col gap-2 p-4`}>
            <span className="text-[15px] font-semibold">{d === ctx.today ? `Today · ${dayLabel(d)}` : dayLabel(d)}</span>
            {exams.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg bg-[rgba(255,59,48,0.08)] px-3 py-2 text-[14px]">
                <span className="w-[92px] shrink-0 text-xs font-semibold text-red">{c.examTime || "Exam day"}</span>
                <span className="font-semibold">{c.name} exam</span>
              </div>
            ))}
            {mine.map((s) => (
              <button key={s.id} type="button" onClick={() => ctx.open(draftOf(s))} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1 text-left text-[14px] hover:bg-fill">
                <span className="w-[92px] shrink-0 text-xs tabular-nums text-muted">{s.start}–{s.end}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ background: ctx.color.get(s.courseId) }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{ctx.course.get(s.courseId)?.name}</span>
                {s.review && <span className="shrink-0 rounded-md bg-fill px-2 py-0.5 text-[11px] font-semibold text-muted">Final review</span>}
              </button>
            ))}
            {!exams.length && !mine.length && <span className="text-[13px] text-muted">Rest day</span>}
          </div>
        );
      })}
      {shown < days.length && (
        <div><Btn tone="plain" onClick={() => setShown((n) => n + STEP)}>Show the next {Math.min(STEP, days.length - shown)} days</Btn></div>
      )}
    </div>
  );
}

/** Add, change or delete one session. */
function SessionDialog({ draft, courses, sessions, onClose, onSaved, onDeleted }: {
  draft: Draft;
  courses: TimetableCourse[];
  sessions: StoredSession[];
  onClose: () => void;
  onSaved: (s: StoredSession, isNew: boolean) => void;
  onDeleted: (id: string) => void;
}) {
  const [d, setD] = useState(draft);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLSelectElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const lengths = LENGTHS.includes(d.len) ? LENGTHS : [...LENGTHS, d.len].sort((a, b) => a - b);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const body = { courseId: d.courseId, date: d.date, start: d.start, end: toMins(d.start) + d.len <= 24 * 60 ? toHhmm(toMins(d.start) + d.len) : "" };
    const clean = cleanSession(body, courses);
    if (typeof clean === "string") return setError(body.end ? clean : "The session must end by midnight.");
    if (clash({ ...clean, id: d.id }, sessions)) return setError("That overlaps another session.");
    setBusy(true);
    const r = d.id ? await call(`/api/timetable/sessions/${d.id}`, "PATCH", clean) : await call("/api/timetable/sessions", "POST", clean);
    setBusy(false);
    if (r.error || !r.session) return setError(r.error ?? OFFLINE);
    onSaved(r.session, !d.id);
  }

  async function remove() {
    setBusy(true);
    const r = await call(`/api/timetable/sessions/${d.id}`, "DELETE");
    setBusy(false);
    if (r.error) return setError(r.error);
    onDeleted(d.id!);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={d.id ? "Change session" : "Add session"}
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className={`${cardCls} flex w-full max-w-[420px] flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      >
        <div className="text-[17px] font-semibold">{d.id ? "Change session" : "Add session"}</div>
        <label className={label}>Course
          <select ref={first} value={d.courseId} onChange={(e) => setD({ ...d, courseId: e.target.value })} className={field}>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label className={`${label} col-span-2 sm:col-span-1`}>Date
            <input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} required className={field} />
          </label>
          <label className={label}>Starts
            <input type="time" value={d.start} step={300} onChange={(e) => setD({ ...d, start: e.target.value })} required className={field} />
          </label>
          <label className={label}>Length
            <select value={d.len} onChange={(e) => setD({ ...d, len: Number(e.target.value) })} className={field}>
              {lengths.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : hours(m)}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="m-0 text-[13px] text-red" role="alert">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
          <Btn tone="plain" onClick={onClose}>Cancel</Btn>
          {d.id && <button type="button" onClick={remove} disabled={busy} className="ml-auto h-8 rounded-[7px] px-3 text-[13px] font-medium text-red hover:bg-fill disabled:opacity-50">Delete session</button>}
        </div>
      </form>
    </div>
  );
}
