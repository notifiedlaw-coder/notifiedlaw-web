import { getArticles, getCaseBriefs } from "@/lib/cms";
import { FAQ, SITE, abs } from "@/lib/site";

export const dynamic = "force-dynamic";

// The full text of every public article and case brief in one Markdown file, for LLMs and answer engines.
export async function GET() {
  const [articles, cases] = await Promise.all([getArticles(), getCaseBriefs()]);
  const lines = [
    `# ${SITE.name}: full content`,
    "",
    `> ${SITE.description} Based in Accra, Ghana. Index: ${abs("/llms.txt")}`,
    "",
    "## FAQ",
    ...FAQ.flatMap((f) => [`### ${f.q}`, f.a, ""]),
    "## Articles",
    "",
    ...articles.flatMap((a) => [`### ${a.title}`, `URL: ${abs(`/articles/${a.slug}`)}`, ...(a.date ? [`Published: ${a.date.toISOString().slice(0, 10)}`] : []), "", a.body.trim(), ""]),
    "## Case briefs",
    "",
    ...cases.flatMap((c) => [`### ${c.title}${c.cite ? ` ${c.cite}` : ""}`, `URL: ${abs(`/case-law/${c.slug}`)}`, ...(c.court ? [`Court: ${c.court}`] : []), "", c.body.trim(), ""]),
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
