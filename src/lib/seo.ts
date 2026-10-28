import { SITE, abs } from "@/lib/site";

/** Plain-text excerpt of a Markdown body, cut at a word boundary, for meta descriptions. */
export function excerpt(md: string, max = 155): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+.*$/gm, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>~|#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** BreadcrumbList for a trail of [name, path] pairs, starting from Home. */
export function breadcrumbs(trail: [name: string, path: string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", "/"] as [string, string], ...trail].map(([name, path], i) => ({
      "@type": "ListItem", position: i + 1, name, item: abs(path),
    })),
  };
}

export const OG_IMAGE = { url: SITE.ogImage, width: 1800, height: 1200, alt: "NotifiedLaw on Mac, Home screen" };
