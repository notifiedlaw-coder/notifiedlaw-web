import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/app-shell";

// Section links point at the landing page ("/#..."), so the bar works the same on every public page.
const NAV = [["Learn", "/#pillars"], ["Pricing", "/#pricing"], ["Articles", "/articles"]];
const LOGIN = "/login";
const SIGNUP = "/signup";

/**
 * The signed-out top bar, shared by the landing page and the public pages. Phones get the two actions
 * only (sign in, start free); the section links join them from md up.
 */
export function SiteNav() {
  return (
    <nav data-site-nav aria-label="Main" className="sticky top-0 z-20 border-b border-[#161A26]/[0.08] bg-[#F6F5F2]/95 text-[#161A26] backdrop-blur-md" style={{ colorScheme: "light" }}>
      <div className="mx-auto flex max-w-[1200px] items-center gap-7 px-[18px] py-3 md:px-8 md:py-3.5">
        <Link href="/#top" className="flex items-center gap-2.5 text-[#161A26]! no-underline hover:text-[#161A26]! hover:no-underline">
          <LogoMark ring="#F6F5F2" />
          <Wordmark className="text-[24px]" />
        </Link>
        <div className="hidden gap-6 text-[16px] md:flex">
          {NAV.map(([l, h]) => <a key={h} href={h} className="text-[#23305C]! no-underline hover:underline">{l}</a>)}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Link href={LOGIN} className="text-[16px] text-[#161A26]! no-underline hover:underline">Sign in</Link>
          <Link href={SIGNUP} className="flex h-11 items-center rounded-full bg-[#23305C] px-5 text-[16px] font-semibold text-[#F6F5F2]! no-underline hover:bg-[#1B2649] hover:no-underline">Start free</Link>
        </div>
      </div>
    </nav>
  );
}
