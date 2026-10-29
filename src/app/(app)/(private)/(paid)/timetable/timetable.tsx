"use client";

import { useState } from "react";
import { Btn, Eyebrow, Page, Segmented, Title, cardCls } from "@/components/ui";
import {
  BREAK_MINS, COURSE_COLORS, DEFAULT_INPUT, DIFFICULTY_LABEL, MAX_COURSES, MAX_DAY_HOURS, SESSION_MINS, WEEKDAYS,
  addDays, cleanTimetable, todayIso,
  type Difficulty, type TimetableCourse,
} from "@/lib/timetable";
import type { TimetableState } from "@/lib/timetable-db";
import { Calendar } from "./calendar";
import { OFFLINE, field, hours, label } from "./shared";

const DIFFICULTIES = ["1", "2", "3"] as const;
const HOUR_OPTIONS = Array.from({ length: MAX_DAY_HOURS * 2 + 1 }, (_, i) => i / 2);

const newCourse = (): TimetableCourse => ({ id: crypto.randomUUID(), name: "", examDate: addDays(todayIso(), 28), examTime: "", difficulty: 2 });

/** TimeTable: a study plan built from the student's courses, exam dates and free time, then edited on a calendar. Private to its owner. */
export function Timetable({ initial, suggestions }: { initial: TimetableState | null; suggestions: string[] }) {
  const [saved, setSaved] = useState(initial);
  const [editing, setEditing] = useState(false);
  // The calendar always comes first. Before setup it is empty, with a prompt to add courses and exam dates.
  return editing ? (
    <Editor
      start={saved}
      suggestions={suggestions}
      onSaved={(t) => { setSaved(t); setEditing(false); }}
      onCancel={() => setEditing(false)}
    />
  ) : (
    <Calendar
      state={saved ?? EMPTY}
      empty={!saved}
      setSessions={(f) => setSaved((p) => (p ? { ...p, sessions: f(p.sessions) } : p))}
      onEdit={() => setEditing(true)}
      onDeleted={() => setSaved(null)}
    />
  );
}

const EMPTY: TimetableState = { input: { ...DEFAULT_INPUT, courses: [] }, sessions: [] };

function Editor({ start, suggestions, onSaved, onCancel }: { start: TimetableState | null; suggestions: string[]; onSaved: (t: TimetableState) => void; onCancel: () => void }) {
  const [t, setT] = useState(start?.input ?? { ...DEFAULT_INPUT, courses: [newCourse()] });
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
    const json = (await res?.json().catch(() => null)) as (TimetableState & { error?: string }) | null;
    setBusy(false);
    if (!res?.ok || !json?.input) return setError(json?.error ?? OFFLINE);
    onSaved(json);
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

        {start && <p className="m-0 text-[13px] text-muted">Saving rebuilds your plan from today on. Changes you made on the calendar from today on are replaced; earlier days stay as they are.</p>}
        {error && <p className="m-0 text-[13px] text-red" role="alert">{error}</p>}
        <div className="flex gap-2">
          <Btn type="submit" disabled={busy}>{busy ? "Saving…" : start ? "Save and rebuild" : "Build my timetable"}</Btn>
          <Btn tone="plain" onClick={onCancel}>Cancel</Btn>
        </div>
      </form>
    </Page>
  );
}
