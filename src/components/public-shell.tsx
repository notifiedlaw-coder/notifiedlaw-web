import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/app-shell";
import { SiteNav } from "@/components/site-nav";

const FOOTER = [["Articles", "/articles"], ["Case law", "/case-law"], ["Pricing", "/#pricing"], ["Sign in", "/login"], ["Privacy", "/privacy"], ["Terms", "/terms-of-service"], ["Support", "mailto:notifiedlaw@gmail.com"]];

/** Site chrome for public pages seen by visitors who are not signed in: the landing page's top bar and footer. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="nl-scale flex min-h-screen flex-col bg-canvas text-ink">
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1">{children}</main>
      <footer className="bg-[#161A26] text-[#CFD3DE]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-[18px] py-12 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-[#F6F5F2]! no-underline hover:no-underline">
            <LogoMark ring="#161A26" />
            <Wordmark className="text-[28px]" />
          </Link>
          <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            {FOOTER.map(([l, h]) => <a key={l} href={h} className="text-[#CFD3DE]! no-underline hover:text-[#F6F5F2]! hover:underline">{l}</a>)}
            <span>Accra, Ghana</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
