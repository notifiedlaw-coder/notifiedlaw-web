import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Page as Shell } from "@/components/ui";
import { getCaseBriefs } from "@/lib/cms";

// Case briefs come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

const find = async (slug: string) => (await getCaseBriefs()).find((c) => c.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await find(slug);
  if (!c) return {};
  return { title: `${c.title} case brief`, description: `Case brief for ${c.title} ${c.cite}.`, alternates: { canonical: `/case-law/${c.slug}` } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await find(slug);
  if (!c) notFound();
  return (
    <Shell max={760}>
      <article className="flex flex-col gap-4" style={{ fontSize: 17, lineHeight: 1.65 }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.05em] text-muted">Case brief</div>
          <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-[-0.02em]">{c.title}</h1>
          {c.cite && <div className="mt-1 text-sm text-muted">{c.cite}</div>}
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[c.court, ...c.jurisdiction, ...c.courses].filter(Boolean).map((t) => <span key={t} className="rounded-full bg-fill px-3 py-1">{t}</span>)}
        </div>
        <Markdown source={c.body} />
      </article>
    </Shell>
  );
}
