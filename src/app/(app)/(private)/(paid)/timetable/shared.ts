import { useSyncExternalStore } from "react";
import { COURSE_COLORS, addDays, weekday, type FreeBlock, type StoredSession, type TimetableCourse, type TimetableInput } from "@/lib/timetable";

// Styles, formatting, layout and types shared by the TimeTable calendar views and popovers.
export const OFFLINE = "Could not reach NotifiedLaw. Check your connection and try again.";

export const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(Date.parse(iso)));
export const dayLabel = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" });
export const longDate = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const inDays = (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 ? "Done" : `In ${n} days`);
export const startOfWeek = (iso: string) => addDays(iso, -weekday(iso));
export const SNAP = 15; // minutes a dragged time snaps to
export const snap = (m: number) => Math.round(m / SNAP) * SNAP;
export const colorOf = (courses: TimetableCourse[], id: string) => COURSE_COLORS[Math.max(0, courses.findIndex((c) => c.id === id)) % COURSE_COLORS.length];
export const EXAM_COLOR = "#FF3B30";
export const FREE_COLOR = "#34C759";

/** Calendar-style colouring for an event: a pale fill, a solid bar, and text in a deeper shade that reads in both themes. */
export const tint = (c: string) => ({
  fill: `color-mix(in srgb, ${c} 16%, var(--surface))`,
  text: `color-mix(in srgb, ${c} 62%, var(--ink))`,
  bar: c,
});

/** Where on screen a popover points: the event, chip or selection it was opened from. */
export type Anchor = { left: number; top: number; right: number; bottom: number };
export const anchorOf = (el: Element): Anchor => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };

/** What a popover is open for. "new" is a tapped or dragged time that the student turns into a session, exam or free time. */
export type Dialog =
  | { mode: "new"; date: string; start: string; end: string }
  | { mode: "session"; session: StoredSession }
  | { mode: "exam"; courseId: string }
  | { mode: "free"; block: FreeBlock }
  | { mode: "course"; courseId: string | null };

/** What the views read and the edits they can make. Each edit resolves to an error message, or null once saved. */
export type Ctx = {
  input: TimetableInput;
  sessions: StoredSession[];
  today: string;
  hidden: Set<string>; // course ids switched off in the course list
  active: Dialog | null; // the open popover, so its event can show as selected
  open: (d: Dialog, anchor?: Anchor) => void;
  moveSession: (s: StoredSession, date: string, startMins: number, endMins?: number) => Promise<string | null>;
  /** time "" makes the exam all-day; undefined keeps its time. */
  moveExam: (courseId: string, date: string, time?: string) => Promise<string | null>;
};

/** Month view drag-and-drop payload types: a session id, or a course id whose exam is being moved. */
export const DRAG_SESSION = "text/x-timetable-session";
export const DRAG_EXAM = "text/x-timetable-exam";

/** True while the media query matches; false during server rendering. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => matchMedia(query).matches,
    () => false,
  );
}

/**
 * Side-by-side layout for events that share time, as calendars draw them: each event gets a lane, and every event
 * in a run of overlapping ones is as wide as one lane of that run.
 */
export function lanes<T>(items: T[], span: (t: T) => [number, number]) {
  const out = new Map<T, { lane: number; of: number }>();
  const sorted = [...items].sort((a, b) => span(a)[0] - span(b)[0] || span(b)[1] - span(a)[1]);
  let run: T[] = [];
  let runEnd = -1;
  let ends: number[] = [];
  const close = () => { for (const t of run) out.get(t)!.of = ends.length; run = []; ends = []; };
  for (const t of sorted) {
    const [a, b] = span(t);
    if (a >= runEnd) close();
    let lane = ends.findIndex((e) => e <= a);
    if (lane < 0) { lane = ends.length; ends.push(b); } else ends[lane] = b;
    out.set(t, { lane, of: 0 });
    run.push(t);
    runEnd = Math.max(runEnd, b);
  }
  close();
  return out;
}
