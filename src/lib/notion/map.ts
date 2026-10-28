import { COURSES } from "@/lib/data";

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "Constitutional Law I", "CONSTITUTIONAL LAW 1" and "Constitutional Law 1" all compare equal. */
const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, " ").trim()
    .replace(/\b(legal method)s\b/, "$1")
    .replace(/ iii$/, " 3").replace(/ ii$/, " 2").replace(/ i$/, " 1");

// Built-in courses by normalised title, e.g. "legal method" -> "law-101".
const BUILT_IN = new Map(Object.values(COURSES).flat().map((c) => [norm(c.title), c.slug]));

/** The site slug for a Notion course: an existing course when the titles match, otherwise a new slug. */
export const courseSlugFor = (title: string) => BUILT_IN.get(norm(title)) ?? slugify(title);

export { slugify };
