import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Eyebrow, Page } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { getArticles } from "@/lib/cms";
import { SITE, abs } from "@/lib/site";

// Articles come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

const find = async (slug: string) => (await getArticles()).find((x) => x.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await find((await params).slug);
  if (!a) return {};
  const url = `/articles/${a.slug}`;
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: a.title, description: a.summary, ...(a.date ? { publishedTime: a.date.toISOString() } : {}), ...(a.area ? { section: a.area } : {}) },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const a = await find((await params).slug);
  if (!a) notFound();
  const url = abs(`/articles/${a.slug}`);
  const when = a.date ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" }).format(a.date) : "";
  return (
    <Page max={720}>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.summary,
          ...(a.area ? { articleSection: a.area } : {}),
          ...(a.date ? { datePublished: a.date.toISOString(), dateModified: a.date.toISOString() } : {}),
          inLanguage: "en-GH",
          mainEntityOfPage: url,
          image: abs(SITE.ogImage),
          wordCount: a.body.split(/\s+/).length,
          author: { "@type": "Organization", name: "NotifiedLaw Editorial", url: SITE.url },
          publisher: { "@id": abs("/#org") },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
            { "@type": "ListItem", position: 2, name: "Articles", item: abs("/articles") },
            { "@type": "ListItem", position: 3, name: a.title, item: url },
          ],
        },
      ]} />
      <div>
        {a.area && <Eyebrow color="#ff9f0a">{a.area}</Eyebrow>}
        <h1 className="text-balance mt-1.5 text-[30px] font-bold leading-tight tracking-[-0.02em] md:text-4xl">{a.title}</h1>
        <p className="mt-2 text-sm text-muted">NotifiedLaw Editorial{when ? ` · ${when}` : ""} · {a.mins} min read</p>
      </div>
      <article style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontSize: 17, lineHeight: 1.65 }}>
        <Markdown source={a.body} />
      </article>
    </Page>
  );
}
