import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const FOOTER = [["Library", "/library"], ["Articles", "/articles"], ["Case Law", "/case-law"], ["Pricing", "/#pricing"], ["Sign in", "/login"], ["Create account", "/signup"]];
const LEGAL = [["Privacy", "/privacy"], ["Terms", "/terms-of-service"], ["Support", "mailto:notifiedlaw@gmail.com"]];
const linkCls = "text-ink! no-underline hover:text-ink! hover:underline";

/** Site chrome for public pages seen by visitors who are not signed in: the landing page's top bar and footer. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <footer className="px-[22px] pb-8 text-xs text-muted">
        <nav aria-label="Site" className="mx-auto flex max-w-[1024px] flex-wrap gap-x-5 gap-y-2 border-t-[0.5px] border-edge/15 py-[18px]">
          {FOOTER.map(([l, h]) => <Link key={l} href={h} className={linkCls}>{l}</Link>)}
        </nav>
        <div className="mx-auto flex max-w-[1024px] flex-wrap justify-between gap-x-6 gap-y-3 border-t-[0.5px] border-edge/15 pt-[18px]">
          <span>Copyright © 2026 NotifiedLaw. All rights reserved.</span>
          <div className="flex flex-wrap gap-5">
            {LEGAL.map(([l, h]) => <a key={l} href={h} className={linkCls}>{l}</a>)}
            <span>Accra, Ghana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
