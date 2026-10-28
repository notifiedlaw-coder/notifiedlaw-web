import { UNIVERSITIES } from "@/lib/content";

export const TRIAL_DAYS = 7;
export const LINK_MINUTES = 30;
export const RESEND_SECONDS = 60;
/** Verification emails one account can send in 24 hours. */
export const DAILY_SENDS = 5;

export const domainsFor = (university: string) => UNIVERSITIES.find((u) => u.name === university)?.domains ?? [];

/**
 * Lower-cases and drops a +tag, so name+1@st.ug.edu.gh and Name@st.ug.edu.gh are one address and cannot be
 * used for two accounts.
 */
export function normalizeUniEmail(v: string) {
  const [local = "", domain = ""] = v.trim().toLowerCase().split("@");
  return `${local.split("+")[0]}@${domain}`;
}

/** The address, normalised, if it is a plausible mailbox on one of the university's domains; else an error. */
export function checkUniEmail(raw: unknown, university: string): { email: string } | { error: string } {
  const domains = domainsFor(university);
  if (!domains.length) return { error: "University emails for your university are not supported yet." };
  if (typeof raw !== "string" || raw.length > 254) return { error: "Enter your university email." };
  const email = normalizeUniEmail(raw);
  const m = /^([a-z0-9._-]{1,64})@([a-z0-9.-]+)$/.exec(email);
  if (!m || m[1].startsWith(".") || m[1].endsWith(".") || m[1].includes("..")) return { error: "Enter a valid email address." };
  const host = m[2];
  if (!domains.some((d) => host === d || host.endsWith("." + d)))
    return { error: `Use your ${university} email (ending in ${domains.map((d) => "@" + d).join(" or ")}).` };
  return { email };
}
