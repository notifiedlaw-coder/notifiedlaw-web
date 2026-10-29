import { COURSE_COLORS, addDays, weekday, type FreeBlock, type StoredSession, type TimetableCourse, type TimetableInput } from "@/lib/timetable";

// Styles, formatting and types shared by the TimeTable calendar views and dialogs.
export const OFFLINE = "Could not reach NotifiedLaw. Check your connection and try again.";
export const field = "h-9 min-w-0 rounded-[8px] bg-surface px-2.5 text-[14px] text-ink shadow-[0_0_0_1px_var(--hairline)] outline-none focus:shadow-[0_0_0_2px_#007AFF]";
export const label = "flex flex-col gap-1 text-[12px] font-semibold text-muted";
export const square = "inline-flex size-8 items-center justify-center rounded-[7px] bg-surface text-[17px] text-ink shadow-[0_0_0_0.5px_var(--hairline)] hover:bg-fill";
export const hours = (mins: number) => `${(mins / 60).toFixed(1).replace(/\.0$/, "")} h`;

export const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(Date.parse(iso)));
export const dayLabel = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" });
export const longDate = (iso: string) => fmt(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const inDays = (n: number) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 ? "Done" : `In ${n} days`);
export const startOfWeek = (iso: string) => addDays(iso, -weekday(iso));
export const SNAP = 15; // minutes a dragged time snaps to
export const snap = (m: number) => Math.round(m / SNAP) * SNAP;
export const colorOf = (courses: TimetableCourse[], id: string) => COURSE_COLORS[Math.max(0, courses.findIndex((c) => c.id === id)) % COURSE_COLORS.length];

/** What a dialog is open for. "new" is a tapped or dragged time that the student turns into a session, exam or free time. */
export type Dialog =
  | { mode: "new"; date: string; start: string; end: string }
  | { mode: "session"; session: StoredSession }
  | { mode: "exam"; courseId: string }
  | { mode: "free"; block: FreeBlock }
  | { mode: "course"; courseId: string | null }
  | { mode: "plan" };

/** What the views read and the edits they can make. Each edit resolves to an error message, or null once saved. */
export type Ctx = {
  input: TimetableInput;
  sessions: StoredSession[];
  today: string;
  open: (d: Dialog) => void;
  moveSession: (s: StoredSession, date: string, startMins: number, endMins?: number) => Promise<string | null>;
  moveExam: (courseId: string, date: string, time?: string) => Promise<string | null>;
};

/** Drag-and-drop payload types: a session id, or a course id whose exam is being moved. */
export const DRAG_SESSION = "text/x-timetable-session";
export const DRAG_EXAM = "text/x-timetable-exam";
