const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The site slug for a Notion course, from its title. */
export const courseSlugFor = slugify;

export { slugify };
