import { getArticles, getCaseBriefs, getCourses } from "@/lib/cms";
import { LEVELS, LEVEL_LABEL } from "@/lib/data";
import { FAQ, SITE, abs } from "@/lib/site";
import { PLAN_PRICES, cedis } from "@/lib/content";

export const dynamic = "force-dynamic";

// https://llmstxt.org: a Markdown map of the site for LLMs and answer engines.
export async function GET() {
  const [courses, articles, cases] = await Promise.all([getCourses(), getArticles(), getCaseBriefs()]);
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description} Based in Accra, Ghana.`,
    "",
    "NotifiedLaw helps Ghanaian LLB students study. Content covers course notes, case briefs, articles, Hot Topics podcast write-ups and mock questions.",
    "",
    "## Key pages",
    `- [Home](${abs("/")}): product overview, features and pricing`,
    `- [Library](${abs("/library")}): course notes for every level`,
    `- [Articles](${abs("/articles")}): plain-English explainers on Ghanaian law`,
    `- [Case Law](${abs("/case-law")}): case briefs with ratio and holding`,
    "",
    "## Pricing",
    `- Student: ${cedis(PLAN_PRICES.Student)} per month, every topic from Level 100 to 400`,
    `- Senior Judicial: ${cedis(PLAN_PRICES.Pro)} per month, the full library plus Notified AI`,
    `- Supreme Justice: ${cedis(PLAN_PRICES["Pro Max"])} per month, everything including Pre-Bar, the Bar Course and exam prep`,
    "- No free plan; the first 2 topics of every course are open as a preview.",
    "- Payment: MTN MoMo, Telecel Cash, AT Money. Law students with a university email get a 7-day Senior Judicial trial.",
    "",
    "## Articles",
    ...articles.map((a) => `- [${a.title}](${abs(`/articles/${a.slug}`)})${a.summary ? `: ${a.summary}` : ""}`),
    "",
    "## Case law",
    ...cases.map((c) => `- [${c.title}${c.cite ? ` ${c.cite}` : ""}](${abs(`/case-law/${c.slug}`)})`),
    "",
    "## Courses",
    ...LEVELS.filter((l) => courses[l].length).map((l) => `- ${LEVEL_LABEL[l]}: ${courses[l].map((c) => c.title).join("; ")}`),
    "",
    "## FAQ",
    ...FAQ.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    "## Optional",
    `- [Full text of articles and case briefs](${abs("/llms-full.txt")})`,
    `- [Sitemap](${abs("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
