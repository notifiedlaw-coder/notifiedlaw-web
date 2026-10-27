"use client";

import Link from "next/link";
import { useState } from "react";
import { EPISODES, PODCAST } from "@/lib/content";
import { FAQ } from "@/lib/site";

const LOGIN = "/login";
const SIGNUP = "/signup";
const SUGGESTIONS = ["Quiz me on Tuffuor v A-G", "Outline an answer on negligence", "What is an allodial title?"];
const PRICES = {
  month: { pro: "GH₵45", max: "GH₵85", per: "/ month" },
  semester: { pro: "GH₵150", max: "GH₵290", per: "/ semester" },
};
const NAV = [["Overview", "#features"], ["Notified AI", "#ai"], ["Hot Topics", "#listen"], ["Exam Prep", "#exam"], ["Pricing", "#pricing"]];

// Mobile: swipeable card rail that bleeds to the screen edges. md+: the normal grid.
const rail = "-mx-[22px] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[22px] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0";
const railItem = "w-[82%] shrink-0 snap-center md:w-auto";

const h2 = "m-0 font-bold tracking-[-0.035em] leading-[1.07] text-[clamp(36px,5vw,56px)]";
const pill = "flex h-11 items-center justify-center rounded-full px-[22px] text-[17px] no-underline";
const link = "text-[#0066CC] no-underline hover:underline";

function Slot({ src, label }: { src: string; label: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/landing/${src}.jpg`} alt={label} loading="lazy" className="size-full object-cover" />;
}

function Tier({ name, color, price, per, blurb, items, cta, dark, ctaCls, badge }: {
  name: string; color?: string; price: string; per?: string; blurb: string; items: string[];
  cta: string; dark?: boolean; ctaCls: string; badge?: string;
}) {
  const sub = dark ? "text-[#A1A1A6]" : "text-[#6E6E73]";
  return (
    <div className={`${railItem} flex flex-col gap-[18px] rounded-[28px] p-9 ${dark ? "bg-[#1D1D1F] text-[#F5F5F7]" : "bg-[#F5F5F7]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[21px] font-semibold" style={{ color }}>{name}</div>
        {badge && <div className="text-xs font-semibold text-[#FF9F0A]">{badge}</div>}
      </div>
      <div><span className="text-[40px] font-bold tracking-[-0.03em]">{price}</span>{per && <span className={`text-[15px] ${sub}`}> {per}</span>}</div>
      <div className={`text-[15px] ${sub}`}>{blurb}</div>
      <div className={`h-px ${dark ? "bg-white/20" : "bg-black/12"}`} />
      <div className="flex flex-col gap-2.5 text-[15px]">{items.map((i) => <div key={i}>{i}</div>)}</div>
      <div className="flex-1" />
      <Link href={SIGNUP} className={`${pill} ${ctaCls}`}>{cta}</Link>
    </div>
  );
}

export default function Landing() {
  const [billing, setBilling] = useState<"month" | "semester">("month");
  const [playing, setPlaying] = useState(false);
  const [menu, setMenu] = useState(false);
  const p = PRICES[billing];

  return (
    <div className="bg-white text-[17px] leading-[1.47] tracking-[-0.022em] text-[#1D1D1F]" style={{ colorScheme: "light" }}>
      <nav className="sticky top-3 z-20 mt-3 px-4">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center gap-5 rounded-[18px] bg-white/80 pl-5 pr-2 shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-200">
          <a href="#top" className="flex items-center gap-2.5 text-[#1D1D1F]! no-underline hover:text-[#1D1D1F]!">
            <span className="text-[17px]"><b>Notified</b><span className="text-[#FF9500]">Law</span></span>
          </a>
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

      <div className="bg-[#F5F5F7] px-[22px] py-3.5 text-center text-sm mt-3">
        Law students get a 7-day Supreme Justice (Max) trial with a university email. <a href="#pricing" className={link}>Learn more ›</a>
      </div>

      <section id="top" className="flex flex-col items-center overflow-hidden px-[22px] pt-[72px] text-center">
        <div className="text-[21px] font-semibold text-[#FF9500]">NotifiedLaw</div>
        <h1 className="mt-2 max-w-[900px] text-balance text-[clamp(48px,9vw,96px)] font-bold leading-[1.02] tracking-[-0.045em]">The Law at Your Fingertips.</h1>
        <p className="mt-[18px] max-w-[640px] text-pretty text-[clamp(19px,2.2vw,24px)] font-medium leading-[1.35] text-[#6E6E73]">Notes, podcasts and exam prep for every law course, at every level.</p>
        <div className="mt-[30px] flex flex-wrap items-center justify-center gap-6">
          <Link href={SIGNUP} className={`${pill} bg-[#0071E3] text-white! hover:text-white! hover:bg-[#0077ED]`}>Start studying free</Link>
          <a href="#pricing" className={link}>See plans ›</a>
        </div>
        <div className="mt-14 aspect-[16/10] w-full max-w-[1080px] overflow-hidden rounded-t-[22px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_30px_80px_rgba(0,0,0,0.14)]">
          <Slot src="hero" label="NotifiedLaw on Mac — Home screen" />
        </div>
      </section>

      <section id="features" className="bg-[#F5F5F7] px-[22px] py-24">
        <div className="mx-auto flex max-w-[1024px] flex-col gap-10">
          <h2 className={h2}>Get the highlights.</h2>
          <div className={`${rail} md:grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]`}>
            <div className={`${railItem} grid grid-cols-1 overflow-hidden rounded-[28px] bg-white md:col-span-full md:grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]`}>
              <div className="flex flex-col justify-center gap-3 p-8 md:p-12">
                <div className="text-sm font-semibold text-[#FF9500]">Library</div>
                <div className="text-balance text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.1] tracking-[-0.03em]">Every course. Every topic. Written for your outline.</div>
                <div className="text-pretty text-[#6E6E73]">Notes matched to your faculty, from Constitutional Law to Land Law, with the cases that matter linked inline.</div>
              </div>
              <div className="min-h-[340px]"><Slot src="library" label="Reader view — Judicial Review note" /></div>
            </div>
            {[
              { tag: "Flashcards", color: "#34C759", title: "Finish a note. Get the deck.", body: "AI turns every note into cards you can flip on the trotro.", slot: "flashcards", alt: "Flashcard — Tuffuor v A-G" },
              { tag: "Case Law", color: "#0071E3", title: "The judgments, searchable.", body: "Find the ratio, the holding and the dissent without the 80-page scroll.", slot: "case-law", alt: "Case Law search results" },
            ].map((f) => (
              <div key={f.tag} className={`${railItem} flex flex-col overflow-hidden rounded-[28px] bg-white`}>
                <div className="flex flex-col gap-2.5 px-10 pb-6 pt-10">
                  <div className="text-sm font-semibold" style={{ color: f.color }}>{f.tag}</div>
                  <div className="text-balance text-[28px] font-bold leading-[1.14] tracking-[-0.025em]">{f.title}</div>
                  <div className="text-[#6E6E73]">{f.body}</div>
                </div>
                <div className="min-h-[260px] flex-1"><Slot src={f.slot} label={f.alt} /></div>
              </div>
            ))}
            {[
              { tag: "Legislation", color: "#34C759", title: "Every Act, with its status.", body: "The Constitution and Acts of Parliament, marked in force, amended or repealed, with original and current text." },
              { tag: "Articles", color: "#FF9F0A", title: "Plain-English explainers.", body: "Short pieces on the questions Ghanaian law students actually ask, linked to the cases and notes behind them." },
              { tag: "Hot Topics", color: "#FF2D55", title: "A podcast on the law in the news.", body: "Each episode links back to the cases, Acts and notes you can study next." },
              { tag: "Exam Prep", color: "#34C759", title: "Past questions, expertly marked.", body: "Answer timed questions and get written feedback from an expert marker." },
              { tag: "My Files", color: "#5E5CE6", title: "Your own materials, in one place.", body: "Keep lecture slides and your own notes next to the library." },
              { tag: "Leaderboard", color: "#FF9500", title: "Study streaks, with company.", body: "See how you rank against coursemates and keep the habit going." },
            ].map((f) => (
              <div key={f.tag} className={`${railItem} flex flex-col gap-2 rounded-[28px] bg-white p-8`}>
                <div className="text-sm font-semibold" style={{ color: f.color }}>{f.tag}</div>
                <div className="text-balance text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">{f.title}</div>
                <div className="text-[#6E6E73]">{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai" className="bg-black px-[22px] py-[120px] text-[#F5F5F7]">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center gap-[18px] text-center">
          <div className="text-[21px] font-semibold text-[#BF5AF2]">Notified AI</div>
          <h2 className="m-0 max-w-[860px] text-balance text-[clamp(40px,6.5vw,80px)] font-bold leading-[1.04] tracking-[-0.045em]">A tutor that has read every note.</h2>
          <p className="m-0 max-w-[620px] text-pretty text-[21px] text-[#A1A1A6]">Ask in plain English. Get answers grounded in your course material, with the cases cited.</p>
          <div className="mt-10 flex w-full max-w-[720px] flex-col gap-4 rounded-3xl bg-[#1C1C1E] p-7 text-left">
            <div className="max-w-[80%] self-end rounded-[20px_20px_6px_20px] bg-[#0A84FF] px-4 py-2.5 text-white">Explain stare decisis simply.</div>
            <div className="max-w-[88%] self-start rounded-[20px_20px_20px_6px] bg-[#2C2C2E] px-[18px] py-3.5 leading-[1.5]">Courts follow earlier decisions on the same point of law. In Ghana, the Supreme Court binds every lower court, but under Article 129(3) it may depart from its own past decisions.</div>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {SUGGESTIONS.map((s) => <span key={s} className="rounded-full border-[0.5px] border-white/15 bg-white/10 px-3.5 py-2 text-sm">{s}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section id="listen" className="bg-white px-[22px] py-[120px]">
        <div className="mx-auto grid max-w-[1024px] grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-center gap-14">
          <div className="flex flex-col gap-4">
            <div className="text-[21px] font-semibold text-[#FF2D55]">Hot Topics Podcast</div>
            <h2 className={`${h2} text-balance`}>The law behind the week.</h2>
            <p className="m-0 text-pretty text-[19px] text-[#6E6E73]">{PODCAST.tagline}</p>
          </div>
          <div className="flex flex-col gap-5 rounded-[28px] bg-[#F5F5F7] p-7">
            <div className="flex items-center gap-4">
              <div className="size-[88px] shrink-0 overflow-hidden rounded-[14px]"><Slot src="podcast-art" label="Art" /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#6E6E73]">Latest · Episode {EPISODES[0].n} · {EPISODES[0].area}</div>
                <div className="mt-0.5 text-[19px] font-semibold leading-tight">{EPISODES[0].title}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-1 overflow-hidden rounded-sm bg-black/10"><div className="h-full w-[38%] bg-[#1D1D1F]" /></div>
              <div className="flex justify-between text-xs tabular-nums text-[#6E6E73]"><span>6:30</span><span>−{EPISODES[0].mins - 6}:30</span></div>
            </div>
            <div className="flex items-center justify-center gap-9">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#1D1D1F" aria-hidden><path d="M11 6v12L3 12zM20 6v12l-8-6z" /></svg>
              <button onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause" : "Play"} className="flex size-14 items-center justify-center rounded-full border-0 bg-[#1D1D1F]">
                {playing
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>}
              </button>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#1D1D1F" aria-hidden><path d="M13 6v12l8-6zM4 6v12l8-6z" /></svg>
            </div>
          </div>
        </div>
      </section>

      <section id="exam" className="overflow-hidden bg-[#F5F5F7] px-[22px] pt-[120px]">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center gap-4 text-center">
          <div className="text-[21px] font-semibold text-[#34C759]">Exam Prep</div>
          <h2 className="m-0 max-w-[820px] text-balance text-[clamp(36px,5.5vw,64px)] font-bold leading-[1.05] tracking-[-0.04em]">Write the answer. Get expert marking.</h2>
          <p className="m-0 max-w-[600px] text-pretty text-[19px] text-[#6E6E73]">Timed past questions, marked by an expert with written feedback on what to fix — before your real examiner sees it.</p>
          <div className="mt-12 aspect-video w-full max-w-[900px] overflow-hidden rounded-t-[22px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"><Slot src="exam" label="Exam mode — expert marking" /></div>
        </div>
      </section>

      <section id="pricing" className="bg-white px-[22px] py-[120px]">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center gap-9">
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className={h2}>Which plan is right for you?</h2>
            <p className="m-0 text-[19px] text-[#6E6E73]">Student pricing. Pay with MTN MoMo, Telecel Cash or AT Money.</p>
          </div>
          <div className="flex rounded-full bg-[#E8E8ED] p-[3px]">
            {([["month", "Monthly"], ["semester", "Per semester"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setBilling(k)} className={`h-[34px] rounded-full border-0 px-5 text-sm font-medium text-[#1D1D1F] ${billing === k ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "bg-transparent"}`}>{l}</button>
            ))}
          </div>
          <div className={`${rail} w-[calc(100%+44px)] max-w-none md:w-full md:grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))]`}>
            <Tier name="Attorney" price="Free" blurb="Try NotifiedLaw with starter content." items={["First 2 topics of every course", "Starter flashcard decks"]} cta="Start free" ctaCls="border border-[#0071E3] text-[#0071E3]! hover:text-[#0071E3]! hover:bg-[#0071E3]/5" />
            <Tier name="Senior Judicial" color="#0071E3" price={p.pro} per={p.per} blurb="The full library, with AI to help it stick." items={["All topics, at every level", "AI summaries for every note", "Unlimited AI flashcards"]} cta="Choose Pro" ctaCls="bg-[#0071E3] text-white! hover:text-white! hover:bg-[#0077ED]" />
            <Tier dark name="Supreme Justice" color="#BF5AF2" badge="Most complete" price={p.max} per={p.per} blurb="Everything, plus AI that listens, talks and tutors." items={["Everything in Senior Judicial", "AI podcast of any note", "Personal AI tutor, unlimited", "Exam mode with expert marking"]} cta="Choose Max" ctaCls="bg-[#F5F5F7] text-[#1D1D1F]! hover:text-[#1D1D1F]! hover:bg-white" />
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-[22px] py-[120px]">
        <div className="mx-auto flex max-w-[760px] flex-col gap-9">
          <h2 className={h2}>Questions, answered.</h2>
          <div className="flex flex-col">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-t-[0.5px] border-black/15 py-5 last:border-b-[0.5px]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold">
                  {f.q}
                  <span className="text-[#6E6E73] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="m-0 mt-3 text-[#6E6E73]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F5F5F7] px-[22px] py-[120px] text-center">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-[18px]">
          <h2 className="m-0 text-balance text-[clamp(40px,6vw,72px)] font-bold leading-[1.04] tracking-[-0.045em]">Your LLB starts here.</h2>
          <p className="m-0 text-[21px] text-[#6E6E73]">On Mac, iPhone, Android and the web.</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-6">
            <Link href={SIGNUP} className={`${pill} bg-[#0071E3] text-white! hover:text-white! hover:bg-[#0077ED]`}>Start studying free</Link>
            <a href="#features" className={link}>Learn more ›</a>
          </div>
        </div>
      </section>

      <footer className="bg-[#F5F5F7] px-[22px] pb-8 text-xs text-[#6E6E73]">
        <div className="mx-auto flex max-w-[1024px] flex-wrap justify-between gap-x-6 gap-y-3 border-t-[0.5px] border-black/15 pt-[18px]">
          <span>Copyright © 2026 NotifiedLaw. All rights reserved.</span>
          <div className="flex flex-wrap gap-5">
            {["Privacy", "Terms", "Support"].map((l) => <a key={l} href="#" className="text-[#424245]! no-underline hover:text-[#424245]! hover:underline">{l}</a>)}
            <span>Accra, Ghana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
