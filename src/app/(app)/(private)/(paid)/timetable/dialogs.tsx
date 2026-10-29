"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Segmented } from "@/components/ui";
import {
  DIFFICULTY_LABEL, MAX_COURSES, WEEKDAY_NAMES,
  addDays, cleanSession, cleanTimetable, weekday,
  type Difficulty, type FreeBlock, type StoredSession, type TimetableCourse, type TimetableInput,
} from "@/lib/timetable";
import { EXAM_COLOR, FREE_COLOR, colorOf, fmt, longDate, useMedia, type Anchor, type Dialog } from "./shared";

type SessionFields = Pick<StoredSession, "courseId" | "date" | "start" | "end">;
/** The edits a popover can make. Each resolves to an error message, or null once saved. */
export type Actions = {
  saveInput: (next: TimetableInput) => Promise<string | null>;
  addSession: (f: SessionFields) => Promise<string | null>;
  updateSession: (s: StoredSession, f: SessionFields) => Promise<string | null>;
  deleteSession: (s: StoredSession) => Promise<string | null>;
};
type Props = { input: TimetableInput; sessions: StoredSession[]; today: string; suggestions: string[]; actions: Actions; close: () => void; anchor?: Anchor };

const KINDS = ["Session", "Exam", "Free time"] as const;
type Kind = (typeof KINDS)[number];
const DIFFICULTIES = ["1", "2", "3"] as const;
const NEW = "__new__";
/** A time input's 00:00 as an end time means midnight at the end of the day. */
const endOf = (t: string) => (t === "00:00" ? "24:00" : t);
const inputEnd = (t: string) => (t === "24:00" ? "00:00" : t);
const shortDate = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export function Dialogs({ dialog, ...p }: Props & { dialog: Dialog }) {
  switch (dialog.mode) {
    case "new": return <NewPopover {...p} at={dialog} />;
    case "session": return <SessionPopover {...p} s={dialog.session} />;
    case "exam": return <ExamPopover {...p} courseId={dialog.courseId} />;
    case "free": return <FreePopover {...p} block={dialog.block} />;
    case "course": return <CoursePopover {...p} courseId={dialog.courseId} />;
  }
}

/** Busy and error state for a popover's save: closes it when `f` succeeds, shows the message when it does not. */
function useRun(close: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (f: () => Promise<string | null>) => {
    setBusy(true);
    setError("");
    const e = await f();
    setBusy(false);
    if (e) setError(e);
    else close();
  };
  return { busy, error, run };
}

/**
 * The editing surface, as calendars present it: on desktop a popover beside the event, chip or selection it came
 * from, with an arrow pointing at it; on phones a sheet that rises from the bottom. Rendered on document.body,
 * outside the page zoom, so it lines up with the on-screen anchor. Escape or a click outside closes it.
 */
function Popover({ close, onSubmit, anchor, label, children }: { close: () => void; onSubmit: () => void; anchor?: Anchor; label: string; children: React.ReactNode }) {
  const sheet = useMedia("(max-width: 767px)");
  const ref = useRef<HTMLFormElement>(null);
  const closeRef = useRef(close);
  const [pos, setPos] = useState<{ left: number; top: number; side: "left" | "right" | "none"; arrow: number } | null>(null);
  useEffect(() => { closeRef.current = close; });
  useEffect(() => {
    if (!sheet) ref.current?.querySelector<HTMLElement>("[data-autofocus], input:not([type=hidden]), select")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (sheet || !el) return;
    const place = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!anchor) return setPos({ left: (vw - w) / 2, top: Math.max(12, (vh - h) / 3), side: "none", arrow: 0 });
      const gap = 12;
      const side = anchor.right + gap + w <= vw - 8 ? "right" : anchor.left - gap - w >= 8 ? "left" : "none";
      const left = side === "right" ? anchor.right + gap : side === "left" ? anchor.left - gap - w : Math.min(vw - w - 8, Math.max(8, anchor.left));
      const cy = (anchor.top + anchor.bottom) / 2;
      const top = side === "none" ? Math.min(vh - h - 8, anchor.bottom + gap) : Math.min(vh - h - 8, Math.max(8, cy - 44));
      setPos({ left, top: Math.max(8, top), side, arrow: Math.min(h - 18, Math.max(18, cy - top)) });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [anchor, sheet]);

  const form = (
    <form
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={sheet
        ? "fixed inset-x-0 bottom-0 z-[61] flex max-h-[88dvh] flex-col gap-3 overflow-y-auto rounded-t-[14px] bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-ink shadow-[0_-8px_30px_rgba(0,0,0,0.18)] animate-[tt-sheet_220ms_cubic-bezier(0.2,0.9,0.3,1)]"
        : "fixed z-[61] flex max-h-[calc(100dvh-16px)] w-[320px] flex-col gap-3 overflow-visible rounded-[12px] bg-surface/95 p-3.5 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.2),0_0_0_0.5px_rgba(0,0,0,0.14)] backdrop-blur-xl animate-[tt-pop_140ms_ease-out]"}
      style={sheet ? undefined : { left: pos?.left ?? -9999, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      {sheet && <span className="mx-auto mb-1 h-[5px] w-9 shrink-0 rounded-full bg-track" aria-hidden />}
      {!sheet && pos && pos.side !== "none" && (
        <span aria-hidden className={`absolute size-3 rotate-45 bg-surface ${pos.side === "right" ? "-left-1.5 shadow-[-1px_1px_0_rgba(0,0,0,0.08)]" : "-right-1.5 shadow-[1px_-1px_0_rgba(0,0,0,0.08)]"}`} style={{ top: pos.arrow - 6 }} />
      )}
      <div className={sheet ? "contents" : "flex max-h-[calc(100dvh-44px)] flex-col gap-3 overflow-y-auto"}>{children}</div>
    </form>
  );
  return createPortal(
    <>
      <div className={`fixed inset-0 z-[60] ${sheet ? "bg-black/30 animate-[tt-fade_200ms_ease-out]" : ""}`} onPointerDown={close} aria-hidden />
      {form}
    </>,
    document.body,
  );
}

/** A popover's title: a colour dot, a name, and a line under it. */
function Head({ color, title, sub }: { color: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-start gap-2.5 px-0.5">
      <span className="mt-[7px] size-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold leading-snug">{title}</div>
        {sub && <div className="text-[12px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

/** Settings grouped into one rounded block of rows, each a label on the left and its control on the right. */
const Group = ({ children }: { children: React.ReactNode }) => <div className="divide-y divide-edge/[0.07] overflow-hidden rounded-[10px] bg-fill">{children}</div>;
function Row({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 px-3 text-[15px] md:min-h-[36px] md:text-[13px]">
      <label htmlFor={htmlFor} className="shrink-0">{label}</label>
      <div className="flex min-w-0 items-center justify-end gap-1">{children}</div>
    </div>
  );
}
const ctl = "min-w-0 rounded-md bg-transparent px-1 py-0.5 text-right text-[15px] text-ink outline-none focus:outline-none focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-blue/40 md:text-[13px] [&::-webkit-calendar-picker-indicator]:opacity-40";
const pill = "rounded-md bg-surface/80 px-1.5 py-0.5 shadow-[0_0_0_0.5px_var(--hairline)]";

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[24px] w-[40px] shrink-0 rounded-full transition-colors duration-200 md:h-[20px] md:w-[34px] ${on ? "bg-green" : "bg-track"}`}>
      <span className={`absolute top-[2px] size-[20px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 md:size-[16px] ${on ? "translate-x-[18px] md:translate-x-[16px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

/** The footer: an optional destructive action on the left, Cancel and the main action on the right. */
function Footer({ busy, error, close, save = "Done", danger }: { busy: boolean; error: string; close: () => void; save?: string; danger?: React.ReactNode }) {
  return (
    <>
      {error && <p className="m-0 px-0.5 text-[12px] text-red" role="alert">{error}</p>}
      <div className="flex items-center gap-2 pt-0.5">
        {danger}
        <span className="flex-1" />
        <button type="button" onClick={close} className="h-8 rounded-full px-3 text-[14px] text-blue hover:bg-fill md:h-7 md:text-[13px]">Cancel</button>
        <button type="submit" disabled={busy} className="h-8 rounded-full bg-blue px-4 text-[14px] font-semibold text-white hover:bg-blue-press disabled:opacity-50 md:h-7 md:text-[13px]">{busy ? "Saving…" : save}</button>
      </div>
    </>
  );
}
const dangerBtn = "h-8 rounded-full px-2 text-[14px] text-red hover:bg-red/10 disabled:opacity-50 md:h-7 md:text-[13px]";

/** Which course an event is for: one of the timetable's, or a new one typed in on the spot. */
type CoursePick = { id: string; name: string; difficulty: Difficulty };

function CourseRows({ input, value, onChange, suggestions, prefer }: { input: TimetableInput; value: CoursePick; onChange: (p: CoursePick) => void; suggestions: string[]; prefer?: (c: TimetableCourse) => boolean }) {
  const ordered = prefer ? [...input.courses.filter(prefer), ...input.courses.filter((c) => !prefer(c))] : input.courses;
  return (
    <>
      <Row label="Course" htmlFor="tt-course">
        {value.id && <span className="size-2 shrink-0 rounded-full" style={{ background: colorOf(input.courses, value.id) }} aria-hidden />}
        <select id="tt-course" value={value.id || NEW} onChange={(e) => onChange({ ...value, id: e.target.value === NEW ? "" : e.target.value })} className={`${ctl} max-w-[170px] appearance-none pr-4`}
          style={{ background: "no-repeat right center / 9px url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%238e8e93' stroke-width='2.2'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")" }}>
          {ordered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {input.courses.length < MAX_COURSES && <option value={NEW}>New course…</option>}
        </select>
      </Row>
      {!value.id && (
        <>
          <Row label="Name" htmlFor="tt-new-course">
            <input id="tt-new-course" data-autofocus value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} list="timetable-courses" maxLength={80} placeholder="Law of Contract" required className={`${ctl} w-full [&::-webkit-calendar-picker-indicator]:hidden`} />
          </Row>
          <datalist id="timetable-courses">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          <Row label="Difficulty"><Segmented options={DIFFICULTIES} value={String(value.difficulty) as (typeof DIFFICULTIES)[number]} onChange={(v) => onChange({ ...value, difficulty: Number(v) as Difficulty })} labels={DIFFICULTY_LABEL} /></Row>
        </>
      )}
    </>
  );
}

/** The input with the picked course in it (added if new; an existing course with the same name is reused), and its id. */
function withCourse(input: TimetableInput, p: CoursePick): { next: TimetableInput; id: string } | string {
  if (p.id) return { next: input, id: p.id };
  const name = p.name.replace(/\s+/g, " ").trim();
  if (!name) return "Give the new course a name.";
  const same = input.courses.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (same) return { next: input, id: same.id };
  if (input.courses.length >= MAX_COURSES) return `You can have up to ${MAX_COURSES} courses.`;
  const id = crypto.randomUUID();
  return { next: { ...input, courses: [...input.courses, { id, name, examDate: "", examTime: "", difficulty: p.difficulty }] }, id };
}

/** Saves the input only if it changed, after checking it with the same rules as the server. */
async function saveIfChanged(actions: Actions, before: TimetableInput, next: TimetableInput) {
  if (next === before) return null;
  const clean = cleanTimetable(next);
  return typeof clean === "string" ? clean : actions.saveInput(clean);
}

const DateRow = ({ value, onChange, label = "Date" }: { value: string; onChange: (v: string) => void; label?: string }) => (
  <Row label={label} htmlFor="tt-date"><input id="tt-date" type="date" value={value} onChange={(e) => onChange(e.target.value)} required className={`${ctl} ${pill}`} /></Row>
);
const TimeRow = ({ label, value, onChange, end }: { label: string; value: string; onChange: (v: string) => void; end?: boolean }) => (
  <Row label={label} htmlFor={`tt-${label}`}>
    <input id={`tt-${label}`} type="time" step={300} value={end ? inputEnd(value) : value} onChange={(e) => onChange(end ? endOf(e.target.value) : e.target.value)} required className={`${ctl} ${pill}`} />
  </Row>
);
const RepeatRow = ({ day, onChange }: { day: number; onChange: (d: number) => void }) => (
  <Row label="Repeats" htmlFor="tt-day">
    <select id="tt-day" value={day} onChange={(e) => onChange(Number(e.target.value))} className={`${ctl} appearance-none`}>
      {WEEKDAY_NAMES.map((n, i) => <option key={n} value={i}>Every {n}</option>)}
    </select>
  </Row>
);

/** A tapped or dragged time on the calendar, turned into a study session, an exam or weekly free time. */
function NewPopover({ input, sessions, today, suggestions, actions, close, anchor, at }: Props & { at: { date: string; start: string; end: string } }) {
  const hasExam = input.courses.some((c) => c.examDate && c.examDate >= today);
  // Guide a new timetable along: exams first, then free time, then sessions.
  const [kind, setKind] = useState<Kind>(!hasExam ? "Exam" : !input.free.length ? "Free time" : "Session");
  const [f, setF] = useState({ date: at.date, start: at.start, end: at.end, examTime: at.start, allDay: false });
  const firstWithoutExam = input.courses.find((c) => !c.examDate || c.examDate < today);
  const [course, setCourse] = useState<CoursePick>({ id: (kind === "Exam" ? firstWithoutExam?.id : input.courses.find((c) => c.examDate > at.date)?.id) ?? input.courses[0]?.id ?? "", name: "", difficulty: 2 });
  const { busy, error, run } = useRun(close);
  const picked = input.courses.find((c) => c.id === course.id);

  const save = () => run(async () => {
    if (kind === "Free time") {
      const block: FreeBlock = { id: crypto.randomUUID(), day: weekday(f.date), start: f.start, end: f.end };
      return saveIfChanged(actions, input, { ...input, free: [...input.free, block] });
    }
    const w = withCourse(input, course);
    if (typeof w === "string") return w;
    if (kind === "Exam") {
      const next = { ...w.next, courses: w.next.courses.map((c) => (c.id === w.id ? { ...c, examDate: f.date, examTime: f.allDay ? "" : f.examTime } : c)) };
      return saveIfChanged(actions, input, next);
    }
    const s = cleanSession({ courseId: w.id, date: f.date, start: f.start, end: f.end }, w.next.courses);
    if (typeof s === "string") return s;
    if (sessions.some((o) => o.date === s.date && o.start < s.end && s.start < o.end)) return "That overlaps another session.";
    const e = await saveIfChanged(actions, input, w.next);
    return e ?? actions.addSession(s);
  });

  const color = kind === "Exam" ? EXAM_COLOR : kind === "Free time" ? FREE_COLOR : course.id ? colorOf(input.courses, course.id) : "var(--color-blue)";
  return (
    <Popover label="New event" close={close} onSubmit={save} anchor={anchor}>
      <Head color={color} title={kind === "Free time" ? "Free time" : kind === "Exam" ? "New exam" : "New study session"} sub={kind === "Free time" ? `Every ${WEEKDAY_NAMES[weekday(f.date)]} · ${f.start}–${f.end}` : shortDate(f.date)} />
      <Segmented options={KINDS} value={kind} onChange={setKind} />
      {kind === "Free time" ? (
        <>
          <Group>
            <RepeatRow day={weekday(f.date)} onChange={(d) => setF({ ...f, date: addDays(f.date, d - weekday(f.date)) })} />
            <TimeRow label="From" value={f.start} onChange={(start) => setF({ ...f, start })} />
            <TimeRow label="To" value={f.end} onChange={(end) => setF({ ...f, end })} end />
          </Group>
          <p className="m-0 px-0.5 text-[12px] leading-snug text-muted">When you can study. It repeats every week.</p>
        </>
      ) : (
        <>
          <Group>
            <CourseRows input={input} value={course} onChange={setCourse} suggestions={suggestions} prefer={kind === "Exam" ? (c) => !c.examDate || c.examDate < today : undefined} />
          </Group>
          {kind === "Exam" ? (
            <Group>
              <Row label="All-day"><Switch on={f.allDay} onChange={(allDay) => setF({ ...f, allDay })} label="All-day exam" /></Row>
              <DateRow value={f.date} onChange={(date) => setF({ ...f, date })} />
              {!f.allDay && <TimeRow label="Starts" value={f.examTime} onChange={(examTime) => setF({ ...f, examTime })} />}
            </Group>
          ) : (
            <Group>
              <DateRow value={f.date} onChange={(date) => setF({ ...f, date })} />
              <TimeRow label="Starts" value={f.start} onChange={(start) => setF({ ...f, start })} />
              <TimeRow label="Ends" value={f.end} onChange={(end) => setF({ ...f, end })} end />
            </Group>
          )}
          {kind === "Exam" && picked?.examDate && <p className="m-0 px-0.5 text-[12px] text-muted">Moves the {picked.name} exam from {shortDate(picked.examDate)}.</p>}
        </>
      )}
      <Footer busy={busy} error={error} close={close} save="Add" />
    </Popover>
  );
}

function SessionPopover({ input, suggestions, actions, close, anchor, s }: Props & { s: StoredSession }) {
  const [f, setF] = useState({ date: s.date, start: s.start, end: s.end });
  const [course, setCourse] = useState<CoursePick>({ id: s.courseId, name: "", difficulty: 2 });
  const { busy, error, run } = useRun(close);
  const save = () => run(async () => {
    const w = withCourse(input, course);
    if (typeof w === "string") return w;
    const clean = cleanSession({ ...f, courseId: w.id }, w.next.courses);
    if (typeof clean === "string") return clean;
    const e = await saveIfChanged(actions, input, w.next);
    return e ?? actions.updateSession(s, clean);
  });
  const name = input.courses.find((c) => c.id === s.courseId)?.name ?? "Study session";
  return (
    <Popover label={name} close={close} onSubmit={save} anchor={anchor}>
      <Head color={colorOf(input.courses, s.courseId)} title={name} sub={`${shortDate(s.date)} · ${s.start}–${s.end}${s.review ? " · Final review" : ""}`} />
      <Group><CourseRows input={input} value={course} onChange={setCourse} suggestions={suggestions} /></Group>
      <Group>
        <DateRow value={f.date} onChange={(date) => setF({ ...f, date })} />
        <TimeRow label="Starts" value={f.start} onChange={(start) => setF({ ...f, start })} />
        <TimeRow label="Ends" value={f.end} onChange={(end) => setF({ ...f, end })} end />
      </Group>
      <Footer busy={busy} error={error} close={close} danger={<button type="button" disabled={busy} onClick={() => run(() => actions.deleteSession(s))} className={dangerBtn}>Delete</button>} />
    </Popover>
  );
}

function ExamPopover({ input, actions, close, anchor, courseId }: Props & { courseId: string }) {
  const c = input.courses.find((o) => o.id === courseId)!;
  const [f, setF] = useState({ examDate: c.examDate, examTime: c.examTime || "09:00", allDay: !c.examTime });
  const { busy, error, run } = useRun(close);
  const set = (patch: Partial<TimetableCourse>) => saveIfChanged(actions, input, { ...input, courses: input.courses.map((o) => (o.id === courseId ? { ...o, ...patch } : o)) });
  return (
    <Popover label={`${c.name} exam`} close={close} anchor={anchor}
      onSubmit={() => run(() => (f.examDate ? set({ examDate: f.examDate, examTime: f.allDay ? "" : f.examTime }) : Promise.resolve("Set the exam date.")))}>
      <Head color={EXAM_COLOR} title={`${c.name} exam`} sub={c.examDate ? `${longDate(c.examDate)}${c.examTime ? ` at ${c.examTime}` : ""}` : undefined} />
      <Group>
        <Row label="All-day"><Switch on={f.allDay} onChange={(allDay) => setF({ ...f, allDay })} label="All-day exam" /></Row>
        <DateRow value={f.examDate} onChange={(examDate) => setF({ ...f, examDate })} />
        {!f.allDay && <TimeRow label="Starts" value={f.examTime} onChange={(examTime) => setF({ ...f, examTime })} />}
      </Group>
      <Footer busy={busy} error={error} close={close} danger={<button type="button" disabled={busy} onClick={() => run(() => set({ examDate: "", examTime: "" }))} className={dangerBtn}>Remove exam</button>} />
    </Popover>
  );
}

function FreePopover({ input, actions, close, anchor, block }: Props & { block: FreeBlock }) {
  const [f, setF] = useState(block);
  const { busy, error, run } = useRun(close);
  const save = (free: FreeBlock[]) => run(() => saveIfChanged(actions, input, { ...input, free }));
  return (
    <Popover label="Free time" close={close} anchor={anchor} onSubmit={() => save(input.free.map((b) => (b.id === block.id ? f : b)))}>
      <Head color={FREE_COLOR} title="Free time" sub={`Every ${WEEKDAY_NAMES[block.day]} · ${block.start}–${block.end}`} />
      <Group>
        <RepeatRow day={f.day} onChange={(day) => setF({ ...f, day })} />
        <TimeRow label="From" value={f.start} onChange={(start) => setF({ ...f, start })} />
        <TimeRow label="To" value={f.end} onChange={(end) => setF({ ...f, end })} end />
      </Group>
      <Footer busy={busy} error={error} close={close} danger={<button type="button" disabled={busy} onClick={() => save(input.free.filter((b) => b.id !== block.id))} className={dangerBtn}>Remove</button>} />
    </Popover>
  );
}

/** Add a course, or rename, re-rate or delete one, from the course list. */
function CoursePopover({ input, sessions, suggestions, actions, close, anchor, courseId }: Props & { courseId: string | null }) {
  const c = input.courses.find((o) => o.id === courseId);
  const [f, setF] = useState({ name: c?.name ?? "", difficulty: c?.difficulty ?? (2 as Difficulty), examDate: c?.examDate ?? "", examTime: c?.examTime || "09:00", allDay: !!c?.examDate && !c.examTime });
  const [confirm, setConfirm] = useState(false);
  const { busy, error, run } = useRun(close);
  const count = sessions.filter((s) => s.courseId === courseId).length;
  const save = () => run(() => {
    if (!f.name.trim()) return Promise.resolve("Give the course a name.");
    if (!c && input.courses.length >= MAX_COURSES) return Promise.resolve(`You can have up to ${MAX_COURSES} courses.`);
    const course = { id: c?.id ?? crypto.randomUUID(), name: f.name, difficulty: f.difficulty, examDate: f.examDate, examTime: f.examDate && !f.allDay ? f.examTime : "" };
    return saveIfChanged(actions, input, { ...input, courses: c ? input.courses.map((o) => (o.id === c.id ? course : o)) : [...input.courses, course] });
  });
  return (
    <Popover label={c ? c.name : "New course"} close={close} onSubmit={save} anchor={anchor}>
      <div className="flex items-center gap-2.5 px-0.5">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: c ? colorOf(input.courses, c.id) : "var(--color-blue)" }} aria-hidden />
        <input data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} list="timetable-course-names" maxLength={80} placeholder="Course name" required aria-label="Course name"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-[17px] font-semibold outline-none placeholder:text-faint focus:bg-fill focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden" />
      </div>
      <datalist id="timetable-course-names">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <Group>
        <Row label="Difficulty"><Segmented options={DIFFICULTIES} value={String(f.difficulty) as (typeof DIFFICULTIES)[number]} onChange={(v) => setF({ ...f, difficulty: Number(v) as Difficulty })} labels={DIFFICULTY_LABEL} /></Row>
      </Group>
      <Group>
        <Row label="Exam" htmlFor="tt-exam-date">
          <input id="tt-exam-date" type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} className={`${ctl} ${pill}`} />
        </Row>
        {f.examDate && <Row label="All-day"><Switch on={f.allDay} onChange={(allDay) => setF({ ...f, allDay })} label="All-day exam" /></Row>}
        {f.examDate && !f.allDay && <TimeRow label="Starts" value={f.examTime} onChange={(examTime) => setF({ ...f, examTime })} />}
      </Group>
      {c && confirm ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-red/10 p-2.5 text-[13px]">
          <span className="min-w-0 flex-1">Delete {c.name}{count ? ` and its ${count} session${count === 1 ? "" : "s"}` : ""}?</span>
          <button type="button" onClick={() => setConfirm(false)} className="h-7 rounded-full px-3 text-[13px] text-blue hover:bg-fill">Keep</button>
          <button type="button" disabled={busy} onClick={() => run(() => actions.saveInput({ ...input, courses: input.courses.filter((o) => o.id !== c.id) }))} className="h-7 rounded-full bg-red px-3 text-[13px] font-semibold text-white disabled:opacity-50">Delete</button>
        </div>
      ) : (
        <Footer busy={busy} error={error} close={close} save={c ? "Done" : "Add"} danger={c && <button type="button" onClick={() => setConfirm(true)} className={dangerBtn}>Delete course</button>} />
      )}
    </Popover>
  );
}

