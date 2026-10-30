import { JsonLd } from "@/components/json-ld";
import { getArticles } from "@/lib/cms";
import { breadcrumbs } from "@/lib/seo";
import { abs } from "@/lib/site";
import { Articles } from "./articles";

export const metadata = {
  title: "Articles on Ghanaian law",
  description: "Plain-English explainers on Ghanaian law for LLB students, linked to the cases, Acts and notes behind them.",
  alternates: { canonical: "/articles" },
};

// Articles come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

type Search = { q?: string; industry?: string; tag?: string };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const initial = { q: one(sp.q).slice(0, 100), industry: one(sp.industry) || "All", tag: one(sp.tag) } satisfies Search & { industry: string; tag: string; q: string };
  const articles = await getArticles();
  const list = articles.map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, industry: a.industry, area: a.area, author: a.author, mins: a.mins, date: a.date?.toISOString() ?? null, image: a.image, tags: a.tags }));
  const newest = [...articles].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  return (
    <>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Articles on Ghanaian law",
          description: "Plain-English explainers on Ghanaian law for LLB students, linked to the cases, Acts and notes behind them.",
          url: abs("/articles"),
          inLanguage: "en-GH",
          isPartOf: { "@id": abs("/#website") },
          publisher: { "@id": abs("/#org") },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: newest.length,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            itemListElement: newest.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: abs(`/articles/${a.slug}`), name: a.title })),
          },
        },
        breadcrumbs([["Articles", "/articles"]]),
      ]} />
      <Articles list={list} initial={initial} />
    </>
  );
}
