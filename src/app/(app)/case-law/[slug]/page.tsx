import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseBookmark } from "@/components/bookmark";
import { myBookmarks } from "@/lib/bookmarks";
import { Markdown } from "@/components/markdown";
import { Page as Shell } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { getCaseBriefs } from "@/lib/cms";
import { OG_IMAGE, breadcrumbs, excerpt } from "@/lib/seo";
import { SITE, abs } from "@/lib/site";

// Case briefs come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

const find = async (slug: string) => (await getCaseBriefs()).find((c) => c.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await find(slug);
  if (!c) return {};
  const title = `${c.title} case brief`;
  const description = `Case brief for ${c.title}${c.cite ? ` ${c.cite}` : ""}${c.court ? `, ${c.court}` : ""}. ${excerpt(c.body, 110)}`.trim();
  const url = `/case-law/${c.slug}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "article", url, siteName: SITE.name, locale: SITE.locale, title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await find(slug);
  if (!c) notFound();
  const bookmarks = await myBookmarks();
  return (
    <Shell max={760}>
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${c.title} case brief`,
          description: excerpt(c.body, 200),
          about: { "@type": "LegalCase", name: c.title, ...(c.cite ? { identifier: c.cite } : {}), ...(c.court ? { courtName: c.court } : {}) },
          inLanguage: "en-GH",
          mainEntityOfPage: abs(`/case-law/${c.slug}`),
          image: abs(SITE.ogImage),
          author: { "@type": "Organization", name: "NotifiedLaw Editorial", url: SITE.url },
          publisher: { "@id": abs("/#org") },
        },
        breadcrumbs([["Case Law", "/case-law"], [c.title, `/case-law/${c.slug}`]]),
      ]} />
      <article className="flex flex-col gap-4" style={{ fontSize: 17, lineHeight: 1.65 }}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted">Case brief</div>
            <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em]">{c.title}</h1>
            {c.cite && <div className="mt-1 text-sm text-muted">{c.cite}</div>}
          </div>
          <CaseBookmark caseId={c.id} title={c.title} saved={bookmarks && bookmarks.includes(c.id)} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[c.court, ...c.jurisdiction, ...c.courses].filter(Boolean).map((t) => <span key={t} className="rounded-full bg-fill px-3 py-1">{t}</span>)}
        </div>
        <Link href={`/ai?ref=case:${c.id}&ask=summarise`} className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-fill px-4 text-[14px] font-medium text-ink no-underline">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 1.8l1.6 4.6L14.2 8l-4.6 1.6L8 14.2 6.4 9.6 1.8 8l4.6-1.6z" /></svg>
          Ask Notified AI about this case
        </Link>
        <Markdown source={c.body} from={2} />
      </article>
    </Shell>
  );
}
