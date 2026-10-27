import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow, Page, cardCls } from "@/components/ui";
import { ARTICLES } from "@/lib/content";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function Page_({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = ARTICLES.find((x) => x.slug === slug);
  if (!a) notFound();
  return (
    <Page max={720}>
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
