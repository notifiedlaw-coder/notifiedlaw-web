import Link from "next/link";
import { PublicShell } from "@/components/public-shell";

export const metadata = { title: "Page not found", robots: { index: false, follow: true } };

const LINKS = [["Library", "/library"], ["Articles", "/articles"], ["Case Law", "/case-law"], ["Home", "/"]];

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4 px-[22px] py-24 text-center">
        <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Error 404</p>
        <h1 className="m-0 text-balance text-[44px] leading-[1.04] md:text-[56px]">We could not find that page.</h1>
        <p className="m-0 text-pretty text-[17px] text-muted">It may have moved, or the link may be wrong. Try one of these instead.</p>
        <ul className="m-0 mt-2 flex list-none flex-wrap justify-center gap-3 p-0">
          {LINKS.map(([l, h]) => (
            <li key={h}><Link href={h} className="flex h-11 items-center rounded-full border border-edge/15 bg-surface px-5 text-[16px] font-medium text-ink! no-underline hover:bg-hover">{l}</Link></li>
          ))}
        </ul>
      </div>
    </PublicShell>
  );
}
