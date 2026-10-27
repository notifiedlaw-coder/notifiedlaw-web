import { ARTICLES, CASE_LIST, STATUTE_LIST } from "@/lib/content";
import { COURSES, LEVELS, LEVEL_LABEL } from "@/lib/data";
import { FAQ, SITE, abs } from "@/lib/site";

export const dynamic = "force-static";

// https://llmstxt.org: a Markdown map of the site for LLMs and answer engines.
export function GET() {
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description} Based in Accra, Ghana.`,
    "",
    "NotifiedLaw helps Ghanaian LLB students study. Content covers the 1992 Constitution, Acts of Parliament, Supreme Court decisions and course notes, with IRAC-style exam practice and an AI tutor (Notified AI).",
    "",
    "## Key pages",
    `- [Home](${abs("/")}): product overview, features and pricing`,
    `- [Library](${abs("/library")}): course notes for every level`,
    `- [Articles](${abs("/articles")}): plain-English explainers on Ghanaian law`,
    `- [Case Law](${abs("/case-law")}): case briefs with ratio and holding`,
    `- [Legislation](${abs("/legislation")}): statutes with amendment status`,
    "",
    "## Articles",
    ...ARTICLES.map((a) => `- [${a.title}](${abs(`/articles/${a.slug}`)}): ${a.summary}`),
    "",
    "## Case law",
    ...CASE_LIST.map((c) => {
      const s = "slug" in c ? (c as { slug: string }).slug : null;
      const t = `${c.title} ${c.cite}, ${c.court}, ${c.year} (${c.area})`;
      return s ? `- [${t}](${abs(`/case-law/${s}`)})` : `- ${t}`;
    }),
    "",
    "## Legislation",
    ...STATUTE_LIST.map((s) => {
      const slug = "slug" in s ? (s as { slug: string }).slug : null;
      const t = `${s.title} (${s.ref})${s.note ? `, ${s.note}` : ""}`;
      return slug ? `- [${t}](${abs(`/legislation/${slug}`)})` : `- ${t}`;
    }),
    "",
    "## Courses",
    ...LEVELS.map((l) => `- ${LEVEL_LABEL[l]}: ${COURSES[l].map((c) => `${c.code} ${c.title}`).join("; ")}`),
    "",
    "## FAQ",
    ...FAQ.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    "## Optional",
    `- [Sitemap](${abs("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
