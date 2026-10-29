// Study TimeTable: what the student tells us (courses, exam dates, free time) and the plan built from it.
// Pure functions only, so the API validates with the same rules the form uses and the plan is built in the browser.

export type Difficulty = 1 | 2 | 3;
export type TimetableCourse = { id: string; name: string; examDate: string; examTime: string; difficulty: Difficulty };
export type TimetableInput = {
  courses: TimetableCourse[];
  hours: number[]; // free study hours for each weekday, Monday first
  startTime: string; // HH:MM, when the first session of a day begins
  sessionMins: number;
  breakMins: number;
};

export type Session = { courseId: string; start: string; end: string; review: boolean };
export type PlanDay = { date: string; sessions: Session[]; exams: TimetableCourse[] };

export const MAX_COURSES = 12;
export const MAX_DAY_HOURS = 12;
/** Exams may be set up to a year ahead; the plan itself stops after MAX_PLAN_DAYS. */
export const MAX_EXAM_DAYS = 366;
export const MAX_PLAN_DAYS = 180;
export const SESSION_MINS = [30, 45, 60, 90, 120] as const;
export const BREAK_MINS = [0, 5, 10, 15, 30] as const;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { 1: "Light", 2: "Medium", 3: "Hard" };
export const COURSE_COLORS = ["#007AFF", "#34C759", "#FF9500", "#AF52DE", "#30B0C7", "#FF3B30", "#5856D6", "#A2845E"];

export const DEFAULT_INPUT: TimetableInput = { courses: [], hours: [2, 2, 2, 2, 2, 4, 3], startTime: "18:00", sessionMins: 60, breakMins: 10 };

// Dates are YYYY-MM-DD and worked out in UTC, which is Accra time all year (no daylight saving).
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
/** 0 for Monday through 6 for Sunday. */
const weekday = (iso: string) => (new Date(Date.parse(iso)).getUTCDay() + 6) % 7;
const toMins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toHhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(Date.parse(v)).toISOString().startsWith(v);
const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/**
 * Checks and tidies a timetable from the client. The cleaned input, or a message saying what to fix.
 * Exam dates in the past are allowed, so a saved timetable stays valid after its first exam.
 */
export function cleanTimetable(raw: unknown, today = todayIso()): TimetableInput | string {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(r.courses) || !r.courses.length) return "Add at least one course.";
  if (r.courses.length > MAX_COURSES) return `You can plan up to ${MAX_COURSES} courses.`;
  const courses: TimetableCourse[] = [];
  for (const c of r.courses as Record<string, unknown>[]) {
    const name = typeof c?.name === "string" ? c.name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!name) return "Give every course a name.";
    if (!isIsoDate(c.examDate)) return `Set an exam date for ${name}.`;
    if (daysBetween(today, c.examDate) > MAX_EXAM_DAYS) return `The exam for ${name} is more than a year away.`;
    const examTime = c.examTime === "" || c.examTime == null ? "" : isTime(c.examTime) ? c.examTime : null;
    if (examTime === null) return `The exam time for ${name} is not a valid time.`;
    const difficulty = [1, 2, 3].includes(c.difficulty as number) ? (c.difficulty as Difficulty) : 2;
    const id = typeof c.id === "string" && /^[\w-]{1,40}$/.test(c.id) ? c.id : crypto.randomUUID();
    if (courses.some((o) => o.id === id)) return "Two courses share the same id.";
    courses.push({ id, name, examDate: c.examDate, examTime, difficulty });
  }
  if (!Array.isArray(r.hours) || r.hours.length !== 7) return "Set your free hours for each day of the week.";
  const hours = r.hours.map((h) => (typeof h === "number" && Number.isFinite(h) ? Math.min(MAX_DAY_HOURS, Math.max(0, Math.round(h * 2) / 2)) : 0));
  if (!hours.some((h) => h > 0)) return "Give yourself some study time on at least one day.";
  if (!isTime(r.startTime)) return "Set the time your study day starts.";
  if (!SESSION_MINS.includes(r.sessionMins as (typeof SESSION_MINS)[number])) return "Choose a session length.";
  if (!BREAK_MINS.includes(r.breakMins as (typeof BREAK_MINS)[number])) return "Choose a break length.";
  return { courses, hours, startTime: r.startTime, sessionMins: r.sessionMins as number, breakMins: r.breakMins as number };
}

/**
 * Builds the plan from `today` to the last exam (at most MAX_PLAN_DAYS). Each day's free hours are cut into
 * sessions. The day before an exam starts with a final review of that course; the other sessions go to the
 * course furthest behind its fair share, where a course's share grows with its difficulty and as its exam nears.
 * A course is not studied on or after its exam day, and the same course is not set twice in a row when another
 * one is waiting.
 */
export function buildPlan(input: TimetableInput, today = todayIso()): PlanDay[] {
  const upcoming = input.courses.filter((c) => c.examDate >= today);
  if (!upcoming.length) return [];
  const last = upcoming.reduce((m, c) => (c.examDate > m ? c.examDate : m), today);
  const span = Math.min(daysBetween(today, last), MAX_PLAN_DAYS);
  const given = new Map(upcoming.map((c) => [c.id, 0]));
  const days: PlanDay[] = [];
  for (let i = 0; i <= span; i++) {
    const date = addDays(today, i);
    const exams = upcoming.filter((c) => c.examDate === date).sort((a, b) => a.examTime.localeCompare(b.examTime));
    const active = upcoming.filter((c) => c.examDate > date);
    const sessions: Session[] = [];
    const free = input.hours[weekday(date)] * 60;
    let at = toMins(input.startTime);
    let used = 0;
    // A review of each exam tomorrow comes first, then the fair-share sessions.
    const reviews = active.filter((c) => daysBetween(date, c.examDate) === 1).map((c) => c.id);
    let prev: string | null = null;
    while (active.length && used + input.sessionMins <= free && at + input.sessionMins <= 24 * 60) {
      let pick = reviews.shift();
      const review = !!pick;
      if (!pick) {
        let best = Infinity;
        for (const c of active) {
          const left = daysBetween(date, c.examDate);
          const weight = c.difficulty * (1 + 7 / left);
          // Behind-ness: minutes so far over weight. Back-to-back repeats only when nothing else is left.
          const score = (given.get(c.id)! + input.sessionMins) / weight + (c.id === prev && active.length > 1 ? 1e9 : 0);
          if (score < best) { best = score; pick = c.id; }
        }
      }
      sessions.push({ courseId: pick!, start: toHhmm(at), end: toHhmm(at + input.sessionMins), review });
      given.set(pick!, given.get(pick!)! + input.sessionMins);
      prev = pick!;
      used += input.sessionMins;
      at += input.sessionMins + input.breakMins;
    }
    days.push({ date, sessions, exams });
  }
  return days;
}

/** Planned study minutes for each course id. */
export function minutesByCourse(days: PlanDay[], sessionMins: number) {
  const out = new Map<string, number>();
  for (const d of days) for (const s of d.sessions) out.set(s.courseId, (out.get(s.courseId) ?? 0) + sessionMins);
  return out;
}
