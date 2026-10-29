"use client";

import { useEffect, useRef, useState } from "react";
import { Btn, Segmented, cardCls } from "@/components/ui";
import {
  BREAK_MINS, DIFFICULTY_LABEL, MAX_COURSES, SESSION_MINS, WEEKDAY_NAMES,
  addDays, cleanSession, cleanTimetable, toMins, weekday,
  type Difficulty, type FreeBlock, type StoredSession, type TimetableCourse, type TimetableInput,
} from "@/lib/timetable";
import { colorOf, field, hours, label, longDate, type Dialog } from "./shared";

type SessionFields = Pick<StoredSession, "courseId" | "date" | "start" | "end">;
/** The edits a dialog can make. Each resolves to an error message, or null once saved. */
export type Actions = {
  saveInput: (next: TimetableInput) => Promise<string | null>;
  addSession: (f: SessionFields) => Promise<string | null>;
  updateSession: (s: StoredSession, f: SessionFields) => Promise<string | null>;
  deleteSession: (s: StoredSession) => Promise<string | null>;
  plan: (sessionMins: number, breakMins: number) => Promise<string | null>;
};
type Props = { input: TimetableInput; sessions: StoredSession[]; today: string; suggestions: string[]; actions: Actions; close: () => void };

const KINDS = ["Study session", "Exam", "Free time"] as const;
type Kind = (typeof KINDS)[number];
const DIFFICULTIES = ["1", "2", "3"] as const;
const NEW = "__new__";
/** A time input's 00:00 as an end time means midnight at the end of the day. */
const endOf = (t: string) => (t === "00:00" ? "24:00" : t);
const inputEnd = (t: string) => (t === "24:00" ? "00:00" : t);

export function Dialogs({ dialog, ...p }: Props & { dialog: Dialog }) {
  switch (dialog.mode) {
    case "new": return <NewDialog {...p} at={dialog} />;
    case "session": return <SessionDialog {...p} s={dialog.session} />;
    case "exam": return <ExamDialog {...p} courseId={dialog.courseId} />;
    case "free": return <FreeDialog {...p} block={dialog.block} />;
    case "course": return <CourseDialog {...p} courseId={dialog.courseId} />;
    case "plan": return <PlanDialog {...p} />;
  }
}

/** Busy and error state for a dialog's save: closes it when `f` succeeds, shows the message when it does not. */
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
  return { busy, error, setError, run };
}

function Modal({ title, close, onSubmit, children }: { title: string; close: () => void; onSubmit: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input, select")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={close}>
      <form
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        onClick={(e) => e.stopPropagation()}
        className={`${cardCls} flex max-h-[90vh] w-full max-w-[440px] flex-col gap-4 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      >
        <div className="text-[17px] font-semibold">{title}</div>
        {children}
      </form>
    </div>
  );
}

function Footer({ busy, error, close, save = "Save", extra }: { busy: boolean; error: string; close: () => void; save?: string; extra?: React.ReactNode }) {
  return (
    <>
      {error && <p className="m-0 text-[13px] text-red" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Btn type="submit" disabled={busy}>{busy ? "Saving…" : save}</Btn>
        <Btn tone="plain" onClick={close}>Cancel</Btn>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
    </>
  );
}

const dangerBtn = "h-8 rounded-[7px] px-3 text-[13px] font-medium text-red hover:bg-fill disabled:opacity-50";

/** Which course an event is for: one of the timetable's, or a new one typed in on the spot. */
type CoursePick = { id: string; name: string; difficulty: Difficulty };

function CoursePicker({ input, value, onChange, suggestions, prefer }: { input: TimetableInput; value: CoursePick; onChange: (p: CoursePick) => void; suggestions: string[]; prefer?: (c: TimetableCourse) => boolean }) {
  const ordered = prefer ? [...input.courses.filter(prefer), ...input.courses.filter((c) => !prefer(c))] : input.courses;
  return (
    <>
      <label className={label}>Course
        <select value={value.id || NEW} onChange={(e) => onChange({ ...value, id: e.target.value === NEW ? "" : e.target.value })} className={field}>
          {ordered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          {input.courses.length < MAX_COURSES && <option value={NEW}>+ New course…</option>}
        </select>
      </label>
      {!value.id && (
        <>
          <label className={label}>New course name
            <input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} list="timetable-courses" maxLength={80} placeholder="e.g. Law of Contract" required className={field} />
          </label>
          <datalist id="timetable-courses">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          <DifficultyField value={value.difficulty} onChange={(difficulty) => onChange({ ...value, difficulty })} />
        </>
      )}
    </>
  );
}

function DifficultyField({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <div className={label}>How hard is it for you?
      <Segmented options={DIFFICULTIES} value={String(value) as (typeof DIFFICULTIES)[number]} onChange={(v) => onChange(Number(v) as Difficulty)} labels={DIFFICULTY_LABEL} />
    </div>
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

function SessionFieldsUi({ date, start, end, set }: { date: string; start: string; end: string; set: (p: { date?: string; start?: string; end?: string }) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <label className={`${label} col-span-2 sm:col-span-1`}>Date
        <input type="date" value={date} onChange={(e) => set({ date: e.target.value })} required className={field} />
      </label>
      <label className={label}>Starts
        <input type="time" value={start} step={300} onChange={(e) => set({ start: e.target.value })} required className={field} />
      </label>
      <label className={label}>Ends
        <input type="time" value={inputEnd(end)} step={300} onChange={(e) => set({ end: endOf(e.target.value) })} required className={field} />
      </label>
    </div>
  );
}

/** A tapped or dragged time on the calendar, turned into a study session, an exam or weekly free time. */
function NewDialog({ input, sessions, today, suggestions, actions, close, at }: Props & { at: { date: string; start: string; end: string } }) {
  const hasExam = input.courses.some((c) => c.examDate && c.examDate >= today);
  // Guide a new timetable along: exams first, then free time, then sessions.
  const [kind, setKind] = useState<Kind>(!hasExam ? "Exam" : !input.free.length ? "Free time" : "Study session");
  const [f, setF] = useState({ date: at.date, start: at.start, end: at.end, examTime: at.start });
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
      const next = { ...w.next, courses: w.next.courses.map((c) => (c.id === w.id ? { ...c, examDate: f.date, examTime: f.examTime } : c)) };
      return saveIfChanged(actions, input, next);
    }
    const s = cleanSession({ courseId: w.id, date: f.date, start: f.start, end: f.end }, w.next.courses);
    if (typeof s === "string") return s;
    if (sessions.some((o) => o.date === s.date && o.start < s.end && s.start < o.end)) return "That overlaps another session.";
    const e = await saveIfChanged(actions, input, w.next);
    return e ?? actions.addSession(s);
  });

  return (
    <Modal title={`Add to ${longDate(f.date)}`} close={close} onSubmit={save}>
      <Segmented options={KINDS} value={kind} onChange={setKind} />
      {kind === "Free time" ? (
        <>
          <p className="m-0 text-[13px] text-muted">Time you can study, every {WEEKDAY_NAMES[weekday(f.date)]}. &ldquo;Plan my sessions&rdquo; fills it with study sessions.</p>
          <label className={label}>Day
            <select value={weekday(f.date)} onChange={(e) => setF({ ...f, date: addDays(f.date, Number(e.target.value) - weekday(f.date)) })} className={field}>
              {WEEKDAY_NAMES.map((n, i) => <option key={n} value={i}>Every {n}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>From<input type="time" value={f.start} step={300} onChange={(e) => setF({ ...f, start: e.target.value })} required className={field} /></label>
            <label className={label}>To<input type="time" value={inputEnd(f.end)} step={300} onChange={(e) => setF({ ...f, end: endOf(e.target.value) })} required className={field} /></label>
          </div>
        </>
      ) : (
        <>
          <CoursePicker input={input} value={course} onChange={setCourse} suggestions={suggestions} prefer={kind === "Exam" ? (c) => !c.examDate || c.examDate < today : undefined} />
          {kind === "Exam" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>Date<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required className={field} /></label>
                <label className={label}><span>Time <span className="font-normal">(optional)</span></span><input type="time" value={f.examTime} onChange={(e) => setF({ ...f, examTime: e.target.value })} className={field} /></label>
              </div>
              {picked?.examDate && <p className="m-0 text-[12px] text-muted">This moves the {picked.name} exam from {longDate(picked.examDate)}.</p>}
            </>
          ) : (
            <SessionFieldsUi date={f.date} start={f.start} end={f.end} set={(p) => setF({ ...f, ...p })} />
          )}
        </>
      )}
      <Footer busy={busy} error={error} close={close} save={`Add ${kind.toLowerCase()}`} />
    </Modal>
  );
}

function SessionDialog({ input, suggestions, actions, close, s }: Props & { s: StoredSession }) {
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
  return (
    <Modal title="Study session" close={close} onSubmit={save}>
      <CoursePicker input={input} value={course} onChange={setCourse} suggestions={suggestions} />
      <SessionFieldsUi date={f.date} start={f.start} end={f.end} set={(p) => setF({ ...f, ...p })} />
      {s.review && <p className="m-0 text-[12px] text-muted">A final review before the exam.</p>}
      <Footer busy={busy} error={error} close={close} extra={<button type="button" disabled={busy} onClick={() => run(() => actions.deleteSession(s))} className={dangerBtn}>Delete session</button>} />
    </Modal>
  );
}

function ExamDialog({ input, actions, close, courseId }: Props & { courseId: string }) {
  const c = input.courses.find((o) => o.id === courseId)!;
  const [f, setF] = useState({ examDate: c.examDate, examTime: c.examTime });
  const { busy, error, run } = useRun(close);
  const set = (patch: Partial<TimetableCourse>) => saveIfChanged(actions, input, { ...input, courses: input.courses.map((o) => (o.id === courseId ? { ...o, ...patch } : o)) });
  return (
    <Modal title={`${c.name} exam`} close={close} onSubmit={() => run(() => (f.examDate ? set(f) : Promise.resolve("Set the exam date.")))}>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>Date<input type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} required className={field} /></label>
        <label className={label}><span>Time <span className="font-normal">(optional)</span></span><input type="time" value={f.examTime} onChange={(e) => setF({ ...f, examTime: e.target.value })} className={field} /></label>
      </div>
      <Footer busy={busy} error={error} close={close} extra={<button type="button" disabled={busy} onClick={() => run(() => set({ examDate: "", examTime: "" }))} className={dangerBtn}>Remove exam</button>} />
    </Modal>
  );
}

function FreeDialog({ input, actions, close, block }: Props & { block: FreeBlock }) {
  const [f, setF] = useState(block);
  const { busy, error, run } = useRun(close);
  const save = (free: FreeBlock[]) => run(() => saveIfChanged(actions, input, { ...input, free }));
  return (
    <Modal title="Weekly free time" close={close} onSubmit={() => save(input.free.map((b) => (b.id === block.id ? f : b)))}>
      <p className="m-0 text-[13px] text-muted">Repeats every week. &ldquo;Plan my sessions&rdquo; fills it with study sessions.</p>
      <label className={label}>Day
        <select value={f.day} onChange={(e) => setF({ ...f, day: Number(e.target.value) })} className={field}>
          {WEEKDAY_NAMES.map((n, i) => <option key={n} value={i}>Every {n}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>From<input type="time" value={f.start} step={300} onChange={(e) => setF({ ...f, start: e.target.value })} required className={field} /></label>
        <label className={label}>To<input type="time" value={inputEnd(f.end)} step={300} onChange={(e) => setF({ ...f, end: endOf(e.target.value) })} required className={field} /></label>
      </div>
      <Footer busy={busy} error={error} close={close} extra={<button type="button" disabled={busy} onClick={() => save(input.free.filter((b) => b.id !== block.id))} className={dangerBtn}>Remove</button>} />
    </Modal>
  );
}

/** Add a course, or rename, re-rate or delete one, from the course chips above the calendar. */
function CourseDialog({ input, sessions, suggestions, actions, close, courseId }: Props & { courseId: string | null }) {
  const c = input.courses.find((o) => o.id === courseId);
  const [f, setF] = useState({ name: c?.name ?? "", difficulty: c?.difficulty ?? (2 as Difficulty), examDate: c?.examDate ?? "", examTime: c?.examTime ?? "" });
  const [confirm, setConfirm] = useState(false);
  const { busy, error, run } = useRun(close);
  const count = sessions.filter((s) => s.courseId === courseId).length;
  const save = () => run(() => {
    if (!f.name.trim()) return Promise.resolve("Give the course a name.");
    if (!c && input.courses.length >= MAX_COURSES) return Promise.resolve(`You can have up to ${MAX_COURSES} courses.`);
    const course = { id: c?.id ?? crypto.randomUUID(), ...f, examTime: f.examDate ? f.examTime : "" };
    return saveIfChanged(actions, input, { ...input, courses: c ? input.courses.map((o) => (o.id === c.id ? course : o)) : [...input.courses, course] });
  });
  return (
    <Modal title={c ? "Course" : "Add course"} close={close} onSubmit={save}>
      <label className={label}>Name
        <span className="flex items-center gap-2">
          {c && <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(input.courses, c.id) }} aria-hidden />}
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} list="timetable-course-names" maxLength={80} placeholder="e.g. Law of Contract" required className={`${field} flex-1`} />
        </span>
      </label>
      <datalist id="timetable-course-names">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <DifficultyField value={f.difficulty} onChange={(difficulty) => setF({ ...f, difficulty })} />
      <div className="grid grid-cols-2 gap-3">
        <label className={label}><span>Exam date <span className="font-normal">(optional)</span></span><input type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} className={field} /></label>
        <label className={label}><span>Exam time <span className="font-normal">(optional)</span></span><input type="time" value={f.examTime} disabled={!f.examDate} onChange={(e) => setF({ ...f, examTime: e.target.value })} className={field} /></label>
      </div>
      {c && confirm ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-fill p-3 text-[13px]">
          <span className="flex-1">Delete {c.name}{count ? ` and its ${count} session${count === 1 ? "" : "s"}` : ""}?</span>
          <button type="button" disabled={busy} onClick={() => run(() => actions.saveInput({ ...input, courses: input.courses.filter((o) => o.id !== c.id) }))} className={dangerBtn}>Delete</button>
          <Btn tone="plain" onClick={() => setConfirm(false)}>Keep</Btn>
        </div>
      ) : (
        <Footer busy={busy} error={error} close={close} save={c ? "Save" : "Add course"} extra={c && <button type="button" onClick={() => setConfirm(true)} className={dangerBtn}>Delete course</button>} />
      )}
    </Modal>
  );
}

function PlanDialog({ input, sessions, today, actions, close }: Props) {
  const [len, setLen] = useState(input.sessionMins);
  const [brk, setBrk] = useState(input.breakMins);
  const { busy, error, run } = useRun(close);
  const exams = input.courses.filter((c) => c.examDate && c.examDate > today).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const weekly = input.free.reduce((t, b) => t + toMins(b.end) - toMins(b.start), 0);
  const own = sessions.filter((s) => s.date >= today && !s.auto).length;
  const missing = !exams.length ? "Put at least one upcoming exam on the calendar first: tap a day and choose Exam."
    : !input.free.length ? "Mark your free time first: in Week view, drag over the hours you can study and choose Free time." : "";
  return (
    <Modal title="Plan my sessions" close={close} onSubmit={() => run(() => (missing ? Promise.resolve(missing) : actions.plan(len, brk)))}>
      {missing ? (
        <p className="m-0 text-[14px]">{missing}</p>
      ) : (
        <>
          <p className="m-0 text-[14px] leading-snug">
            Fills your free time ({hours(weekly)} a week) from now until your last exam on {longDate(exams[exams.length - 1].examDate)}. Harder courses and closer exams get more time, and the day before each exam starts with a final review.
          </p>
          <p className="m-0 text-[13px] text-muted">
            Sessions planned earlier from today on are replaced.{own ? ` Your own ${own} session${own === 1 ? "" : "s"} (added, moved or changed by you) stay where they are.` : " Sessions you add, move or change yourself are never replaced."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Session length
              <select value={len} onChange={(e) => setLen(Number(e.target.value))} className={field}>
                {SESSION_MINS.map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : hours(m)}</option>)}
              </select>
            </label>
            <label className={label}>Break between sessions
              <select value={brk} onChange={(e) => setBrk(Number(e.target.value))} className={field}>
                {BREAK_MINS.map((m) => <option key={m} value={m}>{m ? `${m} min` : "None"}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
      {missing ? (
        <div className="flex gap-2"><Btn onClick={close}>OK</Btn></div>
      ) : (
        <Footer busy={busy} error={error} close={close} save="Plan sessions" />
      )}
    </Modal>
  );
}
