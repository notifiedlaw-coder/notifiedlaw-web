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
      <Link href="/case-law" className="-mb-2 self-start text-[15px] font-semibold text-link no-underline">‹ Case law</Link>
      <article className="flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {[c.court, ...c.jurisdiction, ...c.courses].filter(Boolean).map((t, i) => (
              <span key={t} className={`rounded-full px-3 py-1 text-[12px] font-bold ${i === 0 ? "bg-peach text-[var(--peach-fg)]" : "bg-fill text-muted"}`}>{t}</span>
            ))}
          </div>
          <h1 className="m-0 text-balance text-[38px] italic leading-[1.05] md:text-[46px]">{c.title}</h1>
          {c.cite && <div className="text-[16px] text-muted">{c.cite}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <Link href={`/ai?ref=case:${c.id}&ask=summarise`} className="inline-flex h-11 items-center gap-2 rounded-full bg-blue px-5 text-[16px] font-semibold text-white! no-underline hover:bg-blue-press">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 1.8l1.6 4.6L14.2 8l-4.6 1.6L8 14.2 6.4 9.6 1.8 8l4.6-1.6z" /></svg>
              Ask AI
            </Link>
            <CaseBookmark caseId={c.id} title={c.title} saved={bookmarks && bookmarks.includes(c.id)} />
          </div>
        </header>
        {/* The brief's sections (Facts, Issue, Held, Ratio) read as small terracotta labels over the body. */}
        <div className="border-t border-edge/[0.12] pt-2 text-[18px] leading-[1.65] [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-serif! [&_h2]:text-[13px]! [&_h2]:font-bold! [&_h2]:uppercase [&_h2]:tracking-[0.1em]! [&_h2]:text-amber">
          <Markdown source={c.body} from={2} />
        </div>
      </article>
    </Shell>
  );
}
