import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/app-shell";

export const CONTACT_EMAIL = "notifiedlaw@gmail.com";

export type LegalSection = { h: string; p: (string | string[])[] };

/** Shared shell for the Terms and Privacy pages: plain reading column with a link back home. */
export function LegalPage({ title, updated, intro, sections }: {
  title: string; updated: string; intro: string; sections: LegalSection[];
}) {
  return (
    <main id="main" tabIndex={-1} className="nl-scale min-h-screen bg-canvas px-[18px] py-10 text-ink md:px-8 md:py-14">
      <article className="mx-auto max-w-[720px]">
        <Link href="/" aria-label="NotifiedLaw home" className="flex w-fit items-center gap-2.5 text-ink! no-underline"><LogoMark /><Wordmark className="text-[26px]" /></Link>
        <div className="mt-10 text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Last updated {updated}</div>
        <h1 className="mb-6 mt-2 text-[40px] leading-[1.04] md:text-[52px]">{title}</h1>
        <p className="text-[19px] leading-relaxed text-muted">{intro}</p>
        {sections.map((s, i) => (
          <section key={s.h}>
            <h2 className="mb-2 mt-10 text-[28px] leading-tight">{i + 1}. {s.h}</h2>
            {s.p.map((b, j) => Array.isArray(b)
              ? <ul key={j} className="my-3 list-disc space-y-1.5 pl-6 text-[17px] leading-relaxed">{b.map((li) => <li key={li}>{li}</li>)}</ul>
              : <p key={j} className="my-3 text-[17px] leading-relaxed">{b}</p>)}
          </section>
        ))}
        <p className="mt-12 border-t border-edge/15 pt-5 text-[15px] text-muted">
          Questions? Email <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-link)" }}>{CONTACT_EMAIL}</a>.
        </p>
      </article>
    </main>
  );
}
