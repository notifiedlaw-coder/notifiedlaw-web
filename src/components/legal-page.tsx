import Link from "next/link";
import { SITE } from "@/lib/site";

export const CONTACT_EMAIL = "support@notifiedlaw.com";

export type LegalSection = { h: string; p: (string | string[])[] };

/** Shared shell for the Terms and Privacy pages: plain reading column with a link back home. */
export function LegalPage({ title, updated, intro, sections }: {
  title: string; updated: string; intro: string; sections: LegalSection[];
}) {
  return (
    <main className="min-h-screen bg-canvas px-[22px] py-12 text-ink">
      <article className="mx-auto max-w-[720px]">
        <Link href="/" className="text-sm font-semibold no-underline" style={{ color: "var(--color-blue)" }}>← {SITE.name}</Link>
        <h1 className="mb-1 mt-6 text-[40px] font-bold leading-[1.1] tracking-[-0.03em]">{title}</h1>
        <p className="mb-6 mt-0 text-sm text-muted">Last updated {updated}</p>
        <p className="text-[17px] leading-relaxed">{intro}</p>
        {sections.map((s, i) => (
          <section key={s.h}>
            <h2 className="mb-2 mt-9 text-[22px] font-semibold tracking-[-0.02em]">{i + 1}. {s.h}</h2>
            {s.p.map((b, j) => Array.isArray(b)
              ? <ul key={j} className="my-3 list-disc space-y-1.5 pl-6 text-[16px] leading-relaxed">{b.map((li) => <li key={li}>{li}</li>)}</ul>
              : <p key={j} className="my-3 text-[16px] leading-relaxed">{b}</p>)}
          </section>
        ))}
        <p className="mt-12 border-t-[0.5px] border-edge/15 pt-5 text-sm text-muted">
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-blue)" }}>{CONTACT_EMAIL}</a>.
        </p>
      </article>
    </main>
  );
}
