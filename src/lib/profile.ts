import { UNIVERSITIES } from "@/lib/content";
import { isPlan, type Level, type Plan } from "@/lib/data";

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;
export const GOALS = ["Course notes", "Podcasts", "Past questions", "Case law", "Articles"] as const;
export const LEVELS: readonly Level[] = ["100", "200", "300", "400", "pre-bar", "bar"];
export const MIN_AGE = 16;

export type ProfileInput = {
  firstName: string; middleName: string; lastName: string; dob: string; gender: string; phone: string;
  university: string; level: Level; goals: string[];
};
export type Profile = ProfileInput;
export type SubscriptionState = { plan: Plan; creditsUsed: number; creditsExtra: number };

/** Shown as "UG Legon" style tags in the sidebar. */
export const UNI_SHORT: Record<string, string> = {
  "University of Ghana": "UG Legon", KNUST: "KNUST", "University of Cape Coast": "UCC",
  GIMPA: "GIMPA", UPSA: "UPSA", "Mountcrest University": "Mountcrest",
};

export const isLevel = (v: unknown): v is Level => LEVELS.includes(v as Level);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1_000_000 ? (v as number) : null);

/** Born on or before this date means MIN_AGE today. ISO dates compare as strings. */
export function latestDob(now = new Date()) {
  const t = now.toISOString().slice(0, 10);
  return `${Number(t.slice(0, 4)) - MIN_AGE}${t.slice(4)}`;
}

/** Validates the onboarding payload; returns the cleaned value or an error message. */
export function parseProfile(b: unknown): ProfileInput | string {
  const o = (b ?? {}) as Record<string, unknown>;
  const p: ProfileInput = {
    firstName: str(o.firstName, 80), middleName: str(o.middleName, 120), lastName: str(o.lastName, 80),
    dob: str(o.dob, 10), gender: str(o.gender, 40), phone: str(o.phone, 30),
    university: str(o.university, 80), level: o.level as Level,
    goals: Array.isArray(o.goals) ? o.goals.filter((g): g is string => (GOALS as readonly string[]).includes(g as string)) : [],
  };
  if (!p.firstName || !p.lastName) return "Name is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dob) || Number.isNaN(Date.parse(p.dob))) return "Date of birth is invalid.";
  if (p.dob > latestDob()) return `You must be at least ${MIN_AGE}.`;
  if (!(GENDERS as readonly string[]).includes(p.gender)) return "Pick a gender option.";
  if (!UNIVERSITIES.some((u) => u.name === p.university)) return "Pick a university.";
  if (!isLevel(p.level)) return "Pick a level.";
  return p;
}

/** Validates a plan/credits update; fields left out are not changed. */
export function parseSubscription(b: unknown): Partial<SubscriptionState> | string {
  const o = (b ?? {}) as Record<string, unknown>;
  const out: Partial<SubscriptionState> = {};
  if (o.plan !== undefined) { if (!isPlan(o.plan)) return "Unknown plan."; out.plan = o.plan; }
  for (const k of ["creditsUsed", "creditsExtra"] as const) {
    if (o[k] !== undefined) { const n = count(o[k]); if (n === null) return `${k} must be a whole number.`; out[k] = n; }
  }
  return out;
}
