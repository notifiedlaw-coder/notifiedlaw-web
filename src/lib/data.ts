export type Level = "100" | "200" | "300" | "400" | "pre-bar" | "bar";

/** Long label for headings, short label for tight segmented controls. */
export const LEVEL_LABEL: Record<Level, string> = {
  "100": "Level 100", "200": "Level 200", "300": "Level 300", "400": "Level 400",
  "pre-bar": "Pre-Bar", bar: "Bar Course",
};
export const LEVEL_SHORT: Record<Level, string> = {
  "100": "100", "200": "200", "300": "300", "400": "400", "pre-bar": "Pre-Bar", bar: "Bar Course",
};
export type Plan = "Free" | "Pro" | "Pro Max";
export const PLANS: readonly Plan[] = ["Free", "Pro", "Pro Max"];
/** Narrows untrusted input (a URL parameter, a stored value) to a known plan. */
export const isPlan = (v: unknown): v is Plan => PLANS.includes(v as Plan);

export const PLAN_NAMES: Record<Plan, string> = {
  Free: "Attorney (Free)",
  Pro: "Senior Judicial (Pro)",
  "Pro Max": "Supreme Justice (Max)",
};

/** Notify Credits: the AI allowance each plan includes per month. Placeholder amounts, to be set before launch. */
export const CREDIT_NAME = "Notify Credits";
export const PLAN_CREDITS: Record<Plan, number> = { Free: 0, Pro: 150, "Pro Max": 500 };
/** My Files storage each plan includes, in bytes. */
const MB = 1024 * 1024;
export const PLAN_STORAGE: Record<Plan, number> = { Free: 500 * MB, Pro: 5 * 1024 * MB, "Pro Max": 10 * 1024 * MB };
/** Largest single upload. The Worker holds the whole file in memory while it checks it. */
export const MAX_FILE_BYTES = 25 * MB;

/** Credits one Notified AI message costs. */
export const AI_MESSAGE_COST = 1;

export const LEVELS: Level[] = ["100", "200", "300", "400", "pre-bar", "bar"];

/** Pre-Bar and the Bar Course are included only with Supreme Justice (Max). */
export const isMaxLevel = (l: Level) => l === "pre-bar" || l === "bar";

/** How many topics of each course the Free plan opens. */
export const FREE_TOPICS = 2;

/** The plan topic `n` (1-based) needs when `plan` cannot read it, else null. The topic page enforces this on the server. */
export function topicLock(plan: Plan, level: Level, n: number): "Pro" | "Pro Max" | null {
  if (isMaxLevel(level) && plan !== "Pro Max") return "Pro Max";
  if (plan === "Free" && n > FREE_TOPICS) return "Pro";
  return null;
}

/** Initials for a course badge, e.g. "Ghana Legal System" -> "GLS". */
export const abbr = (title: string) => title.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join("").toUpperCase().slice(0, 3) || "?";

export type TopicInfo = { title: string; ready: boolean; mins: number; chapters: number };
export type Course = { slug: string; title: string; color: string; semester: string; topics: TopicInfo[] };

export const SEMESTER_LABEL = (s: string) => (s === "1" ? "First Semester" : s === "2" ? "Second Semester" : `Semester ${s}`);

/** Groups a level's courses by semester, in semester order. */
export function bySemester(courses: Course[]) {
  const sems = [...new Set(courses.map((c) => c.semester))].sort();
  return sems.map((s) => ({ semester: s, label: SEMESTER_LABEL(s), courses: courses.filter((c) => c.semester === s) }));
}
