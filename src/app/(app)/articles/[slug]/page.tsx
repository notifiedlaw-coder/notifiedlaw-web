import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow, Page, cardCls } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { ARTICLES } from "@/lib/content";
import { SITE, abs } from "@/lib/site";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) return {};
  const url = `/articles/${a.slug}`;
  return {
    title: a.title,
    description: a.summary,
    alternates: { canonical: url },
    openGraph: { type: "article", url, title: a.title, description: a.summary, publishedTime: new Date(a.date).toISOString(), section: a.area },
  };
}

export default async function Page_({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) notFound();
  const url = abs(`/articles/${a.slug}`);
  return (
    <Page max={720}>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.summary,
          articleSection: a.area,
          datePublished: new Date(a.date).toISOString(),
          dateModified: new Date(a.date).toISOString(),
          inLanguage: "en-GH",
          mainEntityOfPage: url,
          image: abs(SITE.ogImage),
          wordCount: a.body.join(" ").split(/\s+/).length,
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
        <Eyebrow color="#ff9f0a">{a.area}</Eyebrow>
        <h1 className="text-balance mt-1.5 text-[30px] font-bold leading-tight tracking-[-0.02em] md:text-4xl">{a.title}</h1>
        <p className="mt-2 text-sm text-muted">NotifiedLaw Editorial · {a.date} · {a.mins} min read</p>
      </div>
      <article className="flex flex-col gap-4 text-[17px] leading-[1.65]" style={{ fontFamily: "Georgia, 'Iowan Old Style', serif" }}>
        {a.body.map((p, i) => <p key={i}>{p}</p>)}
      </article>
      <section className={`${cardCls} p-5`}>
        <Eyebrow>Related on NotifiedLaw</Eyebrow>
        <div className="mt-2 flex flex-col gap-1.5">
          {a.related.map((r) => <Link key={r.href + r.label} href={r.href} className="text-sm">{r.label}</Link>)}
          <Link href="/hot-topics" className="text-sm">Hot Topics Podcast</Link>
        </div>
      </section>
    </Page>
  );
}
