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
/** Credits one Notified AI message costs. */
export const AI_MESSAGE_COST = 1;

export const LEVELS: Level[] = ["100", "200", "300", "400", "pre-bar", "bar"];

/** Pre-Bar and the Bar Course are included only with Supreme Justice (Max). */
export const isMaxLevel = (l: Level) => l === "pre-bar" || l === "bar";

/** Initials for a course badge, e.g. "Ghana Legal System" -> "GLS". */
export const abbr = (title: string) => title.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).map((w) => w[0]).join("").toUpperCase().slice(0, 3) || "?";

export type TopicInfo = { title: string; ready: boolean; mins: number; chapters: number };
export type Course = { slug: string; title: string; color: string; topics: TopicInfo[] };
