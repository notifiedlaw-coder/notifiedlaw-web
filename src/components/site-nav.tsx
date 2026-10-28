"use client";

import Link from "next/link";
import { useState } from "react";

// Section links point at the landing page ("/#..."), so the bar works the same on every public page.
const NAV = [["Overview", "/#features"], ["Hot Topics", "/#listen"], ["Exam Prep", "/#exam"], ["Pricing", "/#pricing"], ["Articles", "/articles"]];
const LOGIN = "/login";
const SIGNUP = "/signup";

/** The signed-out top bar, shared by the landing page and the public pages. */
export function SiteNav() {
  const [menu, setMenu] = useState(false);
  return (
    <nav className="sticky top-3 z-20 mt-3 px-4 text-[17px] leading-[1.47] tracking-[-0.022em] text-[#1D1D1F]" style={{ colorScheme: "light" }}>
      <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-5 rounded-[18px] bg-white/80 pl-5 pr-2 shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-200">
        <Link href="/#top" className="flex items-center gap-2.5 text-[#1D1D1F]! no-underline hover:text-[#1D1D1F]!">
          <span className="text-[17px]"><b>Notified</b><span className="text-[#FF9500]">Law</span></span>
        </Link>
        <div className="hidden flex-1 justify-center gap-1 text-sm font-medium md:flex">
          {NAV.map(([l, h]) => <a key={h} href={h} className="rounded-[10px] px-3 py-[7px] text-[#1D1D1F]! no-underline hover:text-[#1D1D1F]! hover:bg-black/5">{l}</a>)}
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Link href={LOGIN} className="hidden rounded-[10px] px-3 py-[7px] text-sm font-medium text-[#1D1D1F]! no-underline hover:text-[#1D1D1F]! hover:bg-black/5 md:block">Sign in</Link>
          <Link href={SIGNUP} className="flex h-10 items-center rounded-full bg-[#0071E3] px-[18px] text-sm font-medium text-white! no-underline hover:text-white! hover:bg-[#0077ED]">Start free</Link>
          <button
            onClick={() => setMenu((v) => !v)}
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            className="flex size-10 items-center justify-center rounded-full border-0 bg-transparent text-[#1D1D1F] hover:bg-black/5 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {menu && (
        <div id="mobile-menu" className="mx-auto mt-2 flex max-w-[1080px] flex-col rounded-[18px] bg-white/95 p-2 text-[17px] font-medium shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
          {NAV.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="rounded-[12px] px-4 py-3 text-[#1D1D1F]! no-underline hover:text-[#1D1D1F]! hover:bg-black/5">{l}</a>)}
          <Link href={LOGIN} className="rounded-[12px] px-4 py-3 text-[#1D1D1F]! no-underline hover:text-[#1D1D1F]! hover:bg-black/5">Sign in</Link>
        </div>
      )}
    </nav>
  );
}
