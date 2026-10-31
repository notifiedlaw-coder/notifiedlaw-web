import { UNIVERSITIES } from "@/lib/content";
import { isPlan, type Level, type Plan } from "@/lib/data";

export const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;
export const GOALS = ["Course notes", "Podcasts", "Past questions", "Case law", "Articles"] as const;
export const LEVELS: readonly Level[] = ["100", "200", "300", "400", "pre-bar", "bar"];
export const MIN_AGE = 16;

export const STATUSES = [
  { id: "student", label: "I’m a student", hint: "Studying law, or about to" },
  { id: "employed", label: "I’m employed", hint: "Working, in law or elsewhere" },
  { id: "exploring", label: "Chale, I’m trying oo", hint: "Still figuring things out" },
] as const;
export type Status = (typeof STATUSES)[number]["id"];
export const SECTORS = ["Legal practice", "Judiciary and courts", "Government and public service", "Banking and finance", "Corporate or in-house", "Non-profit and advocacy", "Other"] as const;
export const INTENTS = ["Get into law school", "Prepare for the Bar exam", "Move into a legal career", "Just curious about the law", "Something else"] as const;

/** Everything after `status` is optional; "" means not answered. Only the set for the chosen status is kept. */
export type ProfileInput = {
  firstName: string; middleName: string; lastName: string; dob: string; gender: string; phone: string;
  status: Status;
  university: string; level: Level | "";
  jobTitle: string; employer: string; sector: string;
  intent: string;
  goals: string[];
};
export type Profile = ProfileInput;
/** promoUntil (epoch ms): when a promo code's plan ends, while it is the plan in use; null otherwise. */
export type SubscriptionState = { plan: Plan; creditsUsed: number; promoUntil: number | null };
/**
 * A student account: its university email, the student ID from onboarding ("" before it), and when the
 * mailbox was last proven (epoch ms). `eligible`: recent enough for the Student plan.
 */
export type StudentState = { email: string; university: string; studentId: string; verifiedAt: number; eligible: boolean };
export type Me = {
  profile: Profile | null;
  subscription: SubscriptionState;
  /** null for professional accounts. */
  student: StudentState | null;
  /** The profile picture's URL, or null. */
  avatar: string | null;
};

/** Shown as "UG Legon" style tags in the sidebar. */
export const UNI_SHORT: Record<string, string> = {
  "University of Ghana": "UG Legon", KNUST: "KNUST", "University of Cape Coast": "UCC",
  GIMPA: "GIMPA", UPSA: "UPSA", "Mountcrest University": "Mountcrest", "University of Development Studies": "UDS",
  "Accra Metropolitan University": "AMU", "Wisconsin International University College": "Wisconsin",
};

export const isLevel = (v: unknown): v is Level => LEVELS.includes(v as Level);
const count = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1_000_000 ? (v as number) : null);

/** Sanitises free text: NFC, no control or invisible-format characters, no angle brackets, single spaces, capped length. */
export function clean(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  return v.normalize("NFC").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Letters from any script plus the punctuation real names use. */
const NAME_RE = /^\p{L}[\p{L}\p{M}'’ .-]*$/u;
export const MIN_DOB = "1900-01-01";

/** Ghana mobile number as typed ("024 123 4567", "+233 24 123 4567", "24 123 4567") to "0241234567"; null if invalid. */
export function normalizePhone(v: string) {
  const d = v.replace(/[\s().-]/g, "");
  const m = /^(?:\+?233|0)?(\d{9})$/.exec(d);
  return m && m[1][0] !== "0" ? `0${m[1]}` : null;
}

/** True for a real calendar date written YYYY-MM-DD (rejects 2001-02-31). */
function isRealDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Born on or before this date means MIN_AGE today. ISO dates compare as strings. */
export function latestDob(now = new Date()) {
  const t = now.toISOString().slice(0, 10);
  return `${Number(t.slice(0, 4)) - MIN_AGE}${t.slice(4)}`;
}

export type ProfileErrors = Partial<Record<"firstName" | "middleName" | "lastName" | "dob" | "gender" | "phone" | "status" | "university" | "level" | "jobTitle" | "employer" | "sector" | "intent", string>>;

/** Field-by-field problems with a profile, shared by the forms (as feedback) and the API (as the gate). */
export function profileErrors(p: Omit<ProfileInput, "goals">): ProfileErrors {
  const e: ProfileErrors = {};
  const name = (v: string, k: "firstName" | "middleName" | "lastName", what: string, required: boolean) => {
    const t = clean(v, 200);
    if (!t) { if (required) e[k] = `${what} is required.`; }
    else if (!NAME_RE.test(t)) e[k] = `${what} can only contain letters, spaces, hyphens, apostrophes and full stops.`;
    else if (t.length > (k === "middleName" ? 120 : 80)) e[k] = `${what} is too long.`;
  };
  name(p.firstName, "firstName", "First name", true);
  name(p.middleName, "middleName", "Middle name", false);
  name(p.lastName, "lastName", "Last name", true);
  if (!p.dob) e.dob = "Date of birth is required.";
  else if (!isRealDate(p.dob) || p.dob < MIN_DOB) e.dob = "Enter a valid date of birth.";
  else if (p.dob > latestDob()) e.dob = `You must be at least ${MIN_AGE}.`;
  if (!(GENDERS as readonly string[]).includes(p.gender)) e.gender = "Pick a gender option.";
  if (p.phone.trim() && !normalizePhone(p.phone)) e.phone = "Enter a Ghana mobile number, like 024 123 4567.";
  if (!STATUSES.some((x) => x.id === p.status)) e.status = "Tell us which fits you best.";
  // The follow-up questions are optional: only a value that was given has to be valid.
  if (p.level && !isLevel(p.level)) e.level = "Pick a level.";
  if (p.status === "student" && p.university && !UNIVERSITIES.some((u) => u.name === p.university)) e.university = "Pick a university from the list.";
  if (p.status === "employed") {
    if (clean(p.jobTitle, 200).length > 80) e.jobTitle = "Job title is too long.";
    if (clean(p.employer, 200).length > 100) e.employer = "Employer is too long.";
    if (p.sector && !(SECTORS as readonly string[]).includes(p.sector)) e.sector = "Pick a sector from the list.";
  }
  if (p.status === "exploring" && p.intent && !(INTENTS as readonly string[]).includes(p.intent)) e.intent = "Pick an option from the list.";
  return e;
}

/** Validates the onboarding payload; returns the cleaned value or an error message. */
export function parseProfile(b: unknown): ProfileInput | string {
  const o = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
  const p: ProfileInput = {
    firstName: clean(o.firstName, 80), middleName: clean(o.middleName, 120), lastName: clean(o.lastName, 80),
    dob: typeof o.dob === "string" ? o.dob.trim() : "", gender: clean(o.gender, 40), phone: clean(o.phone, 30),
    status: o.status as Status,
    university: clean(o.university, 80), level: (typeof o.level === "string" ? o.level : "") as Level | "",
    jobTitle: clean(o.jobTitle, 80), employer: clean(o.employer, 100), sector: clean(o.sector, 60), intent: clean(o.intent, 60),
    goals: Array.isArray(o.goals) ? [...new Set(o.goals.filter((g): g is string => (GOALS as readonly string[]).includes(g as string)))] : [],
  };
  const first = Object.values(profileErrors(p))[0];
  if (first) return first;
  p.phone = p.phone ? normalizePhone(p.phone)! : "";
  // Drop answers that belong to a different status, e.g. after someone changes theirs.
  // The level is kept for everyone: it is also the level the library opens at.
  if (p.status !== "student") p.university = "";
  if (p.status !== "employed") { p.jobTitle = ""; p.employer = ""; p.sector = ""; }
  if (p.status !== "exploring") p.intent = "";
  return p;
}

/** Validates a plan/credits update; fields left out are not changed. */
export function parseSubscription(b: unknown): Partial<Pick<SubscriptionState, "plan" | "creditsUsed">> | string {
  const o = (b ?? {}) as Record<string, unknown>;
  const out: Partial<Pick<SubscriptionState, "plan" | "creditsUsed">> = {};
  if (o.plan !== undefined) { if (!isPlan(o.plan)) return "Unknown plan."; out.plan = o.plan; }
  if (o.creditsUsed !== undefined) { const n = count(o.creditsUsed); if (n === null) return "creditsUsed must be a whole number."; out.creditsUsed = n; }
  return out;
}
