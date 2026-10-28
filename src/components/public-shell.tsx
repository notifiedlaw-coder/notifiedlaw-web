import Link from "next/link";

const NAV = [["Library", "/library"], ["Articles", "/articles"], ["Case Law", "/case-law"], ["Pricing", "/#pricing"]];
const FOOTER = [...NAV, ["Sign in", "/login"], ["Create account", "/signup"]];
const LEGAL = [["Privacy", "/privacy"], ["Terms", "/terms-of-service"], ["Support", "mailto:notifiedlaw@gmail.com"]];
const linkCls = "text-ink! no-underline hover:text-ink! hover:underline";

/** Site chrome for public pages seen by visitors who are not signed in: the landing page's top bar and footer. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <nav className="sticky top-3 z-20 mt-3 px-4">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-5 rounded-[18px] bg-surface/80 pl-5 pr-2 shadow-[0_0_0_0.5px_var(--hairline),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-200">
          <Link href="/" className="text-ink! no-underline hover:text-ink!">
            <span className="text-[17px]"><b>Notified</b><span className="text-[#FF9500]">Law</span></span>
          </Link>
          <div className="hidden flex-1 justify-center gap-1 text-sm font-medium md:flex">
            {NAV.map(([l, h]) => <Link key={h} href={h} className="rounded-[10px] px-3 py-[7px] text-ink! no-underline hover:bg-edge/5 hover:text-ink!">{l}</Link>)}
          </div>
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <Link href="/login" className="rounded-[10px] px-3 py-[7px] text-sm font-medium text-ink! no-underline hover:bg-edge/5 hover:text-ink!">Sign in</Link>
            <Link href="/signup" className="flex h-10 items-center rounded-full bg-[#0071E3] px-[18px] text-sm font-medium text-white! no-underline hover:bg-[#0077ED] hover:text-white!">Start free</Link>
          </div>
        </div>
      </nav>
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
