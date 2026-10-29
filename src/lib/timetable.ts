// Study TimeTable: what the student puts on their calendar (courses, exams, weekly free time, sessions) and the
// plan built from it. Pure functions only, so the API validates with the same rules the calendar uses.

export type Difficulty = 1 | 2 | 3;
/** examDate is "" until the student puts the course's exam on the calendar. */
export type TimetableCourse = { id: string; name: string; examDate: string; examTime: string; difficulty: Difficulty };
/** Free time that repeats every week: `day` 0 is Monday. */
export type FreeBlock = { id: string; day: number; start: string; end: string };
export type TimetableInput = {
  courses: TimetableCourse[];
  free: FreeBlock[];
  sessionMins: number; // the planner's session length
  breakMins: number; // and the gap it leaves between sessions
};

export type Session = { courseId: string; start: string; end: string; review: boolean };
export type PlanDay = { date: string; sessions: Session[] };
/** A saved session. `auto` sessions came from the planner and are replaced when it runs again; moving or changing one makes it the student's own. */
export type StoredSession = Session & { id: string; date: string; auto: boolean };

export const MAX_COURSES = 12;
export const MAX_FREE_BLOCKS = 40;
/** Exams may be set up to a year ahead; the plan itself stops after MAX_PLAN_DAYS. */
export const MAX_EXAM_DAYS = 366;
export const MAX_PLAN_DAYS = 180;
/** Saved sessions per user, counting the past ones kept when the plan is rebuilt. */
export const MAX_SESSIONS = 5000;
/** Lengths a session can be given on the calendar, in minutes. */
export const MIN_SESSION_MINS = 15;
export const MAX_SESSION_MINS = 240;
/** How tall an exam with a start time is drawn on the week grid. */
export const EXAM_MINS = 120;
export const SESSION_MINS = [30, 45, 60, 90, 120] as const;
export const BREAK_MINS = [0, 5, 10, 15, 30] as const;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Light", 2: "Medium", 3: "Hard" };
export const COURSE_COLORS = ["#007AFF", "#34C759", "#FF9500", "#AF52DE", "#30B0C7", "#FF3B30", "#5856D6", "#A2845E"];

export const DEFAULT_INPUT: TimetableInput = { courses: [], free: [], sessionMins: 60, breakMins: 10 };

// Dates are YYYY-MM-DD and worked out in UTC, which is Accra time all year (no daylight saving).
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
/** 0 for Monday through 6 for Sunday. */
export const weekday = (iso: string) => (new Date(Date.parse(iso)).getUTCDay() + 6) % 7;
export const toMins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const toHhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(Date.parse(v)).toISOString().startsWith(v);
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
/** A time that can end a span: any time, or midnight at the end of the day. */
const isEnd = (v: unknown): v is string => isTime(v) || v === "24:00";
const isId = (v: unknown): v is string => typeof v === "string" && /^[\w-]{1,40}$/.test(v);

/**
 * Checks and tidies a timetable from the client. The cleaned input, or a message saying what to fix.
 * Exam dates in the past are allowed, so a saved timetable stays valid after its first exam.
 */
export function cleanTimetable(raw: unknown, today = todayIso()): TimetableInput | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(r.courses)) return "Courses are missing.";
  if (r.courses.length > MAX_COURSES) return `You can have up to ${MAX_COURSES} courses.`;
  const courses: TimetableCourse[] = [];
  for (const c of r.courses as Record<string, unknown>[]) {
    const name = typeof c?.name === "string" ? c.name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!name) return "Give every course a name.";
    const examDate = c.examDate === "" || c.examDate == null ? "" : isIsoDate(c.examDate) ? c.examDate : null;
    if (examDate === null) return `The exam date for ${name} is not a valid date.`;
    if (examDate && Math.abs(daysBetween(today, examDate)) > MAX_EXAM_DAYS) return `The exam for ${name} must be within a year of today.`;
    const examTime = !examDate || c.examTime === "" || c.examTime == null ? "" : isTime(c.examTime) ? c.examTime : null;
    if (examTime === null) return `The exam time for ${name} is not a valid time.`;
    const difficulty = [1, 2, 3].includes(c.difficulty as number) ? (c.difficulty as Difficulty) : 2;
    const id = isId(c.id) ? c.id : crypto.randomUUID();
    if (courses.some((o) => o.id === id)) return "Two courses share the same id.";
    courses.push({ id, name, examDate, examTime, difficulty });
  }
  if (!Array.isArray(r.free)) return "Free time is missing.";
  if (r.free.length > MAX_FREE_BLOCKS) return `You can mark up to ${MAX_FREE_BLOCKS} free-time blocks.`;
  const free: FreeBlock[] = [];
  for (const b of r.free as Record<string, unknown>[]) {
    if (!Number.isInteger(b?.day) || (b.day as number) < 0 || (b.day as number) > 6 || !isTime(b.start) || !isEnd(b.end)) return "A free-time block is not valid.";
    if (toMins(b.end) - toMins(b.start) < MIN_SESSION_MINS) return `Free time must be at least ${MIN_SESSION_MINS} minutes long.`;
    const block = { id: isId(b.id) ? b.id : crypto.randomUUID(), day: b.day as number, start: b.start, end: b.end };
    if (free.some((o) => o.id === block.id)) return "Two free-time blocks share the same id.";
    if (free.some((o) => o.day === block.day && o.start < block.end && block.start < o.end)) return `Free time on ${WEEKDAY_NAMES[block.day]} overlaps itself.`;
    free.push(block);
  }
  if (!SESSION_MINS.includes(r.sessionMins as (typeof SESSION_MINS)[number])) return "Choose a session length.";
  if (!BREAK_MINS.includes(r.breakMins as (typeof BREAK_MINS)[number])) return "Choose a break length.";
  return { courses, free, sessionMins: r.sessionMins as number, breakMins: r.breakMins as number };
}

/**
 * Fills the weekly free time from `today` to the last exam (at most MAX_PLAN_DAYS) with sessions, around the
 * sessions in `keep`, which stay where they are. On `today`, nothing starts before `nowMins`. The first session
 * the day before an exam is a final review of that course; the others go to the course furthest behind its fair
 * share, where a course's share grows with its difficulty and as its exam nears. A course is not studied on or
 * after its exam day, and the same course is not set twice in a row when another one is waiting.
 */
export function buildPlan(input: TimetableInput, today: string, keep: StoredSession[] = [], nowMins = 0): PlanDay[] {
  const upcoming = input.courses.filter((c) => c.examDate && c.examDate > today);
  if (!upcoming.length || !input.free.length) return [];
  const last = upcoming.reduce((m, c) => (c.examDate > m ? c.examDate : m), today);
  const span = Math.min(daysBetween(today, last), MAX_PLAN_DAYS);
  const len = input.sessionMins;
  const given = new Map(upcoming.map((c) => [c.id, 0]));
  const days: PlanDay[] = [];
  for (let i = 0; i < span; i++) {
    const date = addDays(today, i);
    const active = upcoming.filter((c) => c.examDate > date);
    const reviews = active.filter((c) => daysBetween(date, c.examDate) === 1).map((c) => c.id);
    const taken = keep.filter((s) => s.date === date).map((s) => [toMins(s.start), toMins(s.end)]);
    const blocks = input.free.filter((b) => b.day === weekday(date)).sort((a, b) => a.start.localeCompare(b.start));
    const sessions: Session[] = [];
    let prev: string | null = null;
    for (const b of blocks) {
      let at = toMins(b.start);
      if (i === 0) at = Math.max(at, Math.ceil(nowMins / 5) * 5);
      while (active.length && at + len <= toMins(b.end)) {
        const hit = taken.find(([s, e]) => s < at + len && at < e);
        if (hit) { at = hit[1]; continue; }
        let pick = reviews.shift();
        const review = !!pick;
        if (!pick) {
          let best = Infinity;
          for (const c of active) {
            const weight = c.difficulty * (1 + 7 / daysBetween(date, c.examDate));
            // Behind-ness: minutes so far over weight. Back-to-back repeats only when nothing else is left.
            const score = (given.get(c.id)! + len) / weight + (c.id === prev && active.length > 1 ? 1e9 : 0);
            if (score < best) { best = score; pick = c.id; }
          }
        }
        sessions.push({ courseId: pick!, start: toHhmm(at), end: toHhmm(at + len), review });
        given.set(pick!, given.get(pick!)! + len);
        prev = pick!;
        at += len + input.breakMins;
      }
    }
    if (sessions.length) days.push({ date, sessions });
  }
  return days;
}

/** Planned study minutes for each course id. */
export function minutesByCourse(sessions: Session[]) {
  const out = new Map<string, number>();
  for (const s of sessions) out.set(s.courseId, (out.get(s.courseId) ?? 0) + toMins(s.end) - toMins(s.start));
  return out;
}

/** The plan's sessions with ids and dates, ready to save. */
export const planSessions = (days: PlanDay[]): StoredSession[] =>
  days.flatMap((d) => d.sessions.map((s) => ({ ...s, id: crypto.randomUUID(), date: d.date, auto: true })));

/**
 * Checks a session added or changed on the calendar: one of the timetable's courses, a date no more than a year
 * either side of today, and a start and end on the same day, MIN_SESSION_MINS to MAX_SESSION_MINS apart.
 */
export function cleanSession(raw: unknown, courses: TimetableCourse[], today = todayIso()): Omit<StoredSession, "id" | "review" | "auto"> | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.courseId !== "string" || !courses.some((c) => c.id === r.courseId)) return "Choose one of your courses.";
  if (!isIsoDate(r.date) || Math.abs(daysBetween(today, r.date)) > MAX_EXAM_DAYS) return "Choose a date within a year of today.";
  if (!isTime(r.start)) return "Set a start time.";
  if (!isEnd(r.end)) return "Set an end time.";
  const len = toMins(r.end) - toMins(r.start);
  if (len < MIN_SESSION_MINS) return `A session must be at least ${MIN_SESSION_MINS} minutes long and end after it starts.`;
  if (len > MAX_SESSION_MINS) return `A session can be at most ${MAX_SESSION_MINS / 60} hours long.`;
  return { courseId: r.courseId, date: r.date, start: r.start, end: r.end };
}

/** The first session in `others` that shares time with `s` on its day, if any. */
export const clash = (s: { id?: string; date: string; start: string; end: string }, others: StoredSession[]) =>
  others.find((o) => o.id !== s.id && o.date === s.date && o.start < s.end && s.start < o.end);
