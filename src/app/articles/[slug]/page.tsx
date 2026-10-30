import Link from "next/link";
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
    ...(a.tags.length ? { keywords: a.tags.map((t) => t.name) } : {}),
    authors: [{ name: a.author || SITE.name }],
    openGraph: { type: "article", url, siteName: SITE.name, locale: SITE.locale, title: a.title, description: a.summary || excerpt(a.body), images: a.image ? [abs(a.image)] : [OG_IMAGE], authors: [a.author || SITE.name], ...(a.date ? { publishedTime: a.date.toISOString(), modifiedTime: a.date.toISOString() } : {}), ...(a.area ? { section: a.area } : {}), ...(a.tags.length ? { tags: a.tags.map((t) => t.name) } : {}) },
    twitter: { card: "summary_large_image", title: a.title, description: a.summary || excerpt(a.body), images: [a.image || SITE.ogImage] },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const all = await getArticles();
  const a = all.find((x) => x.slug === slug);
  if (!a) notFound();
  // Related reads: the most shared tags first, then the same industry, newest first.
  const mine = new Set(a.tags.map((t) => t.slug));
  const related = all
    .filter((x) => x.slug !== a.slug)
    .map((x) => ({ x, score: x.tags.filter((t) => mine.has(t.slug)).length * 2 + (a.industry && x.industry === a.industry ? 1 : 0) }))
    .filter((r) => r.score > 0)
    .sort((p, q) => q.score - p.score || (q.x.date?.getTime() ?? 0) - (p.x.date?.getTime() ?? 0))
    .slice(0, 3)
    .map((r) => r.x);
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
          url,
          isAccessibleForFree: true,
          timeRequired: `PT${a.mins}M`,
          ...(a.tags.length ? { keywords: a.tags.map((t) => t.name).join(", "), about: a.tags.map((t) => ({ "@type": "Thing", name: t.name })) } : {}),
          speakable: { "@type": "SpeakableSpecification", cssSelector: ["#article-title", "#article-answer"] },
          image: a.image ? abs(a.image) : abs(SITE.ogImage),
          wordCount: a.body.split(/\s+/).length,
          author: a.author ? { "@type": "Person", name: a.author, url: abs(`/articles?q=${encodeURIComponent(a.author)}`) } : { "@type": "Organization", name: "NotifiedLaw Editorial", url: SITE.url },
          publisher: { "@id": abs("/#org") },
        },
        breadcrumbs([["Articles", "/articles"], [a.title, `/articles/${a.slug}`]]),
      ]} />
      <header className="flex flex-col gap-3">
        {a.area && <Eyebrow color="#ff9f0a">{a.area}</Eyebrow>}
        <h1 id="article-title" className="text-balance m-0 text-[28px] font-bold leading-[1.15] tracking-[-0.025em] md:text-[40px]">{a.title}</h1>
        {a.summary && <p id="article-answer" className="text-pretty m-0 text-[17px] leading-snug text-muted md:text-[19px]">{a.summary}</p>}
        <div className="mt-1 flex items-center gap-3 border-y border-edge/[0.08] py-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-fill text-sm font-semibold text-muted">{(a.author || "NL").split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}</span>
          <span className="flex min-w-0 flex-col text-[13px] leading-snug">
            <span className="text-[15px] font-semibold">{a.author || "NotifiedLaw Editorial"}</span>
            <span className="text-muted">{a.date && <time dateTime={a.date.toISOString()}>{when}</time>}{a.date ? " · " : ""}{a.mins} min read</span>
          </span>
        </div>
        {a.tags.length > 0 && (
          <nav aria-label="Topics" className="flex flex-wrap gap-2">
            {a.tags.map((t) => <Link key={t.slug} href={`/articles?tag=${t.slug}`} className="rounded-full bg-fill px-3 py-1 text-[13px] font-medium text-muted" style={{ textDecoration: "none" }}>{t.name}</Link>)}
          </nav>
        )}
      </header>
      {a.image && <img src={a.image} alt="" width={1280} height={720} decoding="async" fetchPriority="high" className="aspect-video w-full rounded-2xl bg-fill object-cover shadow-card" />}
      <article aria-labelledby="article-title" className="article-body" style={{ fontFamily: "Georgia, 'Iowan Old Style', serif", fontSize: 18, lineHeight: 1.7 }}>
        <Markdown source={a.body} from={2} />
      </article>
      {related.length > 0 && (
        <section aria-labelledby="related" className="flex flex-col gap-3">
          <h2 id="related" className="m-0 text-[22px] font-bold tracking-[-0.02em]">Keep reading</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.slug} href={`/articles/${r.slug}`} className="flex flex-col gap-1 rounded-2xl bg-surface p-4 shadow-card transition-transform active:scale-[0.98]" style={{ textDecoration: "none", color: "inherit" }}>
                {r.industry && <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#ff9f0a]">{r.industry}</span>}
                <span className="text-[16px] font-semibold leading-snug">{r.title}</span>
                <span className="text-xs text-faint">{r.mins} min read</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="border-t border-edge/10 pt-5">
        <p className="m-0 mb-3 text-sm text-muted">See more NotifiedLaw explainers in Google Search.</p>
        <PreferredSource />
      </div>
    </Page>
  );
}
