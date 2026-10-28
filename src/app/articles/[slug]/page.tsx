import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Eyebrow, Page } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { getArticles } from "@/lib/cms";
import { OG_IMAGE, breadcrumbs, excerpt } from "@/lib/seo";
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
    description: a.summary || excerpt(a.body),
    alternates: { canonical: url },
    openGraph: { type: "article", url, siteName: SITE.name, locale: SITE.locale, title: a.title, description: a.summary || excerpt(a.body), images: [OG_IMAGE], authors: [SITE.name], ...(a.date ? { publishedTime: a.date.toISOString(), modifiedTime: a.date.toISOString() } : {}), ...(a.area ? { section: a.area } : {}) },
    twitter: { card: "summary_large_image", title: a.title, description: a.summary || excerpt(a.body), images: [SITE.ogImage] },
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
          description: a.summary || excerpt(a.body),
          ...(a.area ? { articleSection: a.area } : {}),
          ...(a.date ? { datePublished: a.date.toISOString(), dateModified: a.date.toISOString() } : {}),
          inLanguage: "en-GH",
          mainEntityOfPage: url,
          image: abs(SITE.ogImage),
          wordCount: a.body.split(/\s+/).length,
          author: { "@type": "Organization", name: "NotifiedLaw Editorial", url: SITE.url },
          publisher: { "@id": abs("/#org") },
        },
        breadcrumbs([["Articles", "/articles"], [a.title, `/articles/${a.slug}`]]),
      ]} />
      <div>
        {a.area && <Eyebrow color="#ff9f0a">{a.area}</Eyebrow>}
        <h1 id="article-title" className="text-balance mt-1.5 text-[30px] font-bold leading-tight tracking-[-0.02em] md:text-4xl">{a.title}</h1>
        <p className="mt-2 text-sm text-muted">NotifiedLaw Editorial{when ? ` · ${when}` : ""} · {a.mins} min read</p>
      </div>
      <article aria-labelledby="article-title" style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontSize: 17, lineHeight: 1.65 }}>
        <Markdown source={a.body} from={2} />
      </article>
    </Page>
  );
}
