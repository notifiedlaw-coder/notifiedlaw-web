"use client";

import { useMemo, useState } from "react";
import { Btn, Empty, Eyebrow, Page, Segmented, Title, cardCls } from "@/components/ui";
import {
  BREAK_MINS, COURSE_COLORS, DEFAULT_INPUT, DIFFICULTY_LABEL, MAX_COURSES, MAX_DAY_HOURS, SESSION_MINS, WEEKDAYS,
  addDays, buildPlan, cleanTimetable, daysBetween, minutesByCourse, todayIso,
  type Difficulty, type TimetableCourse, type TimetableInput,
} from "@/lib/timetable";

const OFFLINE = "Could not reach NotifiedLaw. Check your connection and try again.";
const field = "h-9 min-w-0 rounded-[8px] bg-surface px-2.5 text-[14px] text-ink shadow-[0_0_0_1px_var(--hairline)] outline-none focus:shadow-[0_0_0_2px_#007AFF]";
const label = "flex flex-col gap-1 text-[12px] font-semibold text-muted";
const DIFFICULTIES = ["1", "2", "3"] as const;
const STEP = 14; // days shown per "Show more"
const HOUR_OPTIONS = Array.from({ length: MAX_DAY_HOURS * 2 + 1 }, (_, i) => i / 2);

const dayLabel = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.parse(iso)));
const longDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.parse(iso)));
const hours = (mins: number) => `${(mins / 60).toFixed(1).replace(/\.0$/, "")} h`;
const inDays = (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`);
const newCourse = (): TimetableCourse => ({ id: crypto.randomUUID(), name: "", examDate: addDays(todayIso(), 28), examTime: "", difficulty: 2 });

/** TimeTable: a study plan built from the student's courses, exam dates and free time. Private to its owner. */
export function Timetable({ initial, suggestions }: { initial: TimetableInput | null; suggestions: string[] }) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(!initial);
  return editing || !saved ? (
    <Editor
      start={saved ?? { ...DEFAULT_INPUT, courses: [newCourse()] }}
      suggestions={suggestions}
      onSaved={(t) => { setSaved(t); setEditing(false); }}
      onCancel={saved ? () => setEditing(false) : undefined}
    />
  ) : (
    <Plan input={saved} onEdit={() => setEditing(true)} onDeleted={() => { setSaved(null); setEditing(true); }} />
  );
}

function Editor({ start, suggestions, onSaved, onCancel }: { start: TimetableInput; suggestions: string[]; onSaved: (t: TimetableInput) => void; onCancel?: () => void }) {
  const [t, setT] = useState(start);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const setCourse = (id: string, patch: Partial<TimetableCourse>) => setT((p) => ({ ...p, courses: p.courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const weekly = t.hours.reduce((a, b) => a + b, 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanTimetable(t);
    if (typeof clean === "string") return setError(clean);
    setBusy(true);
    setError("");
    const res = await fetch("/api/timetable", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(clean) }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { input?: TimetableInput; error?: string } | null;
    setBusy(false);
    if (!res?.ok || !json?.input) return setError(json?.error ?? OFFLINE);
    onSaved(json.input);
  }

  return (
    <Page max={760}>
      <Title title="TimeTable" sub="Tell us your courses, exam dates and free time. We build a study plan around them. Only you can see it." />
      <form onSubmit={save} className="flex flex-col gap-6">
        <section className={`${cardCls} flex flex-col gap-4 p-5`}>
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Courses and exams</Eyebrow>
            <span className="text-xs text-muted">{t.courses.length} of {MAX_COURSES}</span>
          </div>
          <datalist id="timetable-courses">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          {t.courses.map((c, i) => (
            <div key={c.id} className="flex flex-col gap-3 border-t border-edge/[0.06] pt-4 first-of-type:border-0 first-of-type:pt-0">
              <div className="flex items-end gap-2">
                <span className="mb-3 size-2.5 shrink-0 rounded-full" style={{ background: COURSE_COLORS[i % COURSE_COLORS.length] }} aria-hidden />
                <label className={`${label} flex-1`}>Course
                  <input value={c.name} onChange={(e) => setCourse(c.id, { name: e.target.value })} list="timetable-courses" maxLength={80} placeholder="e.g. Law of Contract" required className={field} />
                </label>
                {t.courses.length > 1 && (
                  <button type="button" onClick={() => setT((p) => ({ ...p, courses: p.courses.filter((o) => o.id !== c.id) }))} className="mb-1.5 h-7 rounded-md px-2 text-[13px] text-red hover:bg-fill" aria-label={`Remove ${c.name || "course"}`}>Remove</button>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-3 pl-4.5">
                <label className={label}>Exam date
                  <input type="date" value={c.examDate} min={todayIso()} onChange={(e) => setCourse(c.id, { examDate: e.target.value })} required className={field} />
                </label>
                <label className={label}><span>Time <span className="font-normal">(optional)</span></span>
                  <input type="time" value={c.examTime} onChange={(e) => setCourse(c.id, { examTime: e.target.value })} className={field} />
                </label>
                <div className={label}>How hard is it for you?
                  <Segmented options={DIFFICULTIES} value={String(c.difficulty) as (typeof DIFFICULTIES)[number]} onChange={(v) => setCourse(c.id, { difficulty: Number(v) as Difficulty })} labels={DIFFICULTY_LABEL} />
                </div>
              </div>
            </div>
          ))}
          {t.courses.length < MAX_COURSES && (
            <div><Btn tone="plain" onClick={() => setT((p) => ({ ...p, courses: [...p.courses, newCourse()] }))}>Add course</Btn></div>
          )}
        </section>

        <section className={`${cardCls} flex flex-col gap-4 p-5`}>
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Free time each week</Eyebrow>
            <span className="text-xs text-muted">{hours(weekly * 60)} a week</span>
          </div>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className={label}>{d}
                <select value={t.hours[i]} onChange={(e) => setT((p) => ({ ...p, hours: p.hours.map((h, j) => (j === i ? Number(e.target.value) : h)) }))} className={field}>
                  {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h === 0 ? "Off" : `${h} h`}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className={label}>Start studying at
              <input type="time" value={t.startTime} onChange={(e) => setT((p) => ({ ...p, startTime: e.target.value }))} required className={field} />
            </label>
            <label className={label}>Session length
              <select value={t.sessionMins} onChange={(e) => setT((p) => ({ ...p, sessionMins: Number(e.target.value) }))} className={field}>
                {SESSION_MINS.map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
            </label>
            <label className={label}>Break between sessions
              <select value={t.breakMins} onChange={(e) => setT((p) => ({ ...p, breakMins: Number(e.target.value) }))} className={field}>
                {BREAK_MINS.map((m) => <option key={m} value={m}>{m ? `${m} min` : "None"}</option>)}
              </select>
            </label>
          </div>
        </section>

        {error && <p className="m-0 text-[13px] text-red" role="alert">{error}</p>}
        <div className="flex gap-2">
          <Btn type="submit" disabled={busy}>{busy ? "Saving…" : "Build my timetable"}</Btn>
          {onCancel && <Btn tone="plain" onClick={onCancel}>Cancel</Btn>}
        </div>
      </form>
    </Page>
  );
}

function Plan({ input, onEdit, onDeleted }: { input: TimetableInput; onEdit: () => void; onDeleted: () => void }) {
  const today = todayIso();
  const days = useMemo(() => buildPlan(input, today), [input, today]);
  const minutes = useMemo(() => minutesByCourse(days, input.sessionMins), [days, input.sessionMins]);
  const [shown, setShown] = useState(STEP);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const color = new Map(input.courses.map((c, i) => [c.id, COURSE_COLORS[i % COURSE_COLORS.length]]));
  const byId = new Map(input.courses.map((c) => [c.id, c]));
  const upcoming = input.courses.filter((c) => c.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate));

  async function remove() {
    setError("");
    const res = await fetch("/api/timetable", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return setError(OFFLINE);
    onDeleted();
  }

  const actions = (
    <div className="flex gap-2">
      <Btn tone="plain" onClick={onEdit}>Edit</Btn>
      {confirm ? (
        <>
          <Btn tone="dark" onClick={remove}>Delete timetable</Btn>
          <Btn tone="plain" onClick={() => setConfirm(false)}>Keep</Btn>
        </>
      ) : (
        <Btn tone="plain" onClick={() => setConfirm(true)}>Delete</Btn>
      )}
    </div>
  );

  return (
    <Page max={760}>
      <Title title="TimeTable" sub="Your study plan, built from your courses, exam dates and free time. Only you can see it." right={actions} />
      {error && <p className="m-0 text-[13px] text-red" role="alert">{error}</p>}
      {!upcoming.length ? (
        <Empty title="All your exams are behind you">Edit your timetable to add the next set of exams.</Empty>
      ) : (
        <>
          <section className={`${cardCls} flex flex-col p-5`}>
            <Eyebrow>Exams</Eyebrow>
            <ul className="m-0 mt-2 flex list-none flex-col p-0">
              {upcoming.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-t border-edge/[0.06] py-2.5 first:border-0">
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

          <section className="flex flex-col gap-3">
            {days.slice(0, shown).map((d) => (
              <div key={d.date} className={`${cardCls} flex flex-col gap-2 p-4`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[15px] font-semibold">{d.date === today ? "Today" : dayLabel(d.date)}</span>
                  {d.date === today && <span className="text-xs text-muted">{dayLabel(d.date)}</span>}
                </div>
                {d.exams.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg bg-[rgba(255,59,48,0.08)] px-3 py-2 text-[14px]">
                    <span className="w-[92px] shrink-0 text-xs font-semibold text-red">{c.examTime || "Exam day"}</span>
                    <span className="font-semibold">{c.name} exam</span>
                  </div>
                ))}
                {d.sessions.map((s) => (
                  <div key={s.start} className="flex items-center gap-3 text-[14px]">
                    <span className="w-[92px] shrink-0 text-xs tabular-nums text-muted">{s.start}–{s.end}</span>
                    <span className="size-2 shrink-0 rounded-full" style={{ background: color.get(s.courseId) }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{byId.get(s.courseId)?.name}</span>
                    {s.review && <span className="shrink-0 rounded-md bg-fill px-2 py-0.5 text-[11px] font-semibold text-muted">Final review</span>}
                  </div>
                ))}
                {!d.exams.length && !d.sessions.length && <span className="text-[13px] text-muted">Rest day</span>}
              </div>
            ))}
            {shown < days.length && (
              <div><Btn tone="plain" onClick={() => setShown((n) => n + STEP)}>Show the next {Math.min(STEP, days.length - shown)} days</Btn></div>
            )}
          </section>
        </>
      )}
    </Page>
  );
}
