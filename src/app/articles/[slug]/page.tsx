import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Eyebrow, Page } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { PreferredSource } from "@/components/preferred-source";
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
    openGraph: { type: "article", url, siteName: SITE.name, locale: SITE.locale, title: a.title, description: a.summary || excerpt(a.body), images: [OG_IMAGE], authors: [a.author || SITE.name], ...(a.date ? { publishedTime: a.date.toISOString(), modifiedTime: a.date.toISOString() } : {}), ...(a.area ? { section: a.area } : {}) },
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
          author: a.author ? { "@type": "Person", name: a.author } : { "@type": "Organization", name: "NotifiedLaw Editorial", url: SITE.url },
          publisher: { "@id": abs("/#org") },
        },
        breadcrumbs([["Articles", "/articles"], [a.title, `/articles/${a.slug}`]]),
      ]} />
      <header className="flex flex-col gap-3">
        {a.area && <Eyebrow color="#ff9f0a">{a.area}</Eyebrow>}
        <h1 id="article-title" className="text-balance m-0 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] md:text-[40px]">{a.title}</h1>
        {a.summary && <p className="text-pretty m-0 text-[17px] leading-snug text-muted md:text-[19px]">{a.summary}</p>}
        <div className="mt-1 flex items-center gap-3 border-y border-edge/[0.08] py-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-fill text-sm font-semibold text-muted">{(a.author || "NL").split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
          <span className="flex min-w-0 flex-col text-[13px] leading-snug">
            <span className="text-[15px] font-semibold">{a.author || "NotifiedLaw Editorial"}</span>
            <span className="text-muted">{[when, `${a.mins} min read`].filter(Boolean).join(" · ")}</span>
          </span>
        </div>
      </header>
      <article aria-labelledby="article-title" className="article-body" style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontSize: 18, lineHeight: 1.7 }}>
        <Markdown source={a.body} from={2} />
      </article>
      <div className="border-t border-edge/10 pt-5">
        <p className="m-0 mb-3 text-sm text-muted">See more NotifiedLaw explainers in Google Search.</p>
        <PreferredSource />
      </div>
    </Page>
  );
}
