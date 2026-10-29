import { UNIVERSITIES } from "@/lib/content";

/** How long an emailed sign-in link works. */
export const LINK_MINUTES = 15;
export const RESEND_SECONDS = 60;
/** Sign-in links one university address can be sent in 24 hours. */
export const DAILY_SENDS = 5;
/** A student must prove they still hold their university mailbox this often to buy or keep the Student plan. */
export const STUDENT_VERIFY_DAYS = 365;

/** The university whose mail domain (or a subdomain of it, like st.ug.edu.gh) the address is on, else null. */
export function universityOf(email: string) {
  const host = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return UNIVERSITIES.find((u) => u.domains.some((d) => host === d || host.endsWith("." + d)))?.name ?? null;
}

/**
 * Lower-cases and drops a +tag, so Name+1@st.ug.edu.gh and name@st.ug.edu.gh are one address and cannot be
 * used for two accounts.
 */
export function normalizeUniEmail(v: string) {
  const [local = "", domain = ""] = v.trim().toLowerCase().split("@");
  return `${local.split("+")[0]}@${domain}`;
}

/** The normalised address and its university, if it is a plausible mailbox at a supported university; else an error. */
export function checkStudentEmail(raw: unknown): { email: string; university: string } | { error: string } {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 254) return { error: "Enter your university email." };
  const email = normalizeUniEmail(raw);
  const m = /^([a-z0-9._-]{1,64})@([a-z0-9.-]+\.[a-z]{2,})$/.exec(email);
  if (!m || m[1].startsWith(".") || m[1].endsWith(".") || m[1].includes("..")) return { error: "Enter a valid email address." };
  const university = universityOf(email);
  if (!university) return { error: "Use the email your university gave you. Personal addresses such as Gmail cannot be used for the Student plan." };
  return { email, university };
}

/** True while the last mailbox proof is recent enough for the Student plan. */
export const studentEligible = (verifiedAt: number, now = Date.now()) => now - verifiedAt < STUDENT_VERIFY_DAYS * 86_400_000;

/** Upper-cases and drops spaces; returns null unless it looks like a student ID (4 to 20 letters, digits, / or -). */
export function normalizeStudentId(v: unknown) {
  if (typeof v !== "string") return null;
  const id = v.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9][A-Z0-9/-]{3,19}$/.test(id) ? id : null;
}
