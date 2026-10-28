"use client";

import Link from "next/link";
import { useState } from "react";
import { AUDIO_SRC, HeroPromo } from "@/components/hero-promo";
import { LandingLoader } from "@/components/landing-loader";
import { SiteNav } from "@/components/site-nav";
import { FAQ } from "@/lib/site";

const LOGIN = "/login";
const SIGNUP = "/signup";
const PRICES = {
  month: { pro: "GH₵45", max: "GH₵85", per: "/ month" },
  semester: { pro: "GH₵150", max: "GH₵290", per: "/ semester" },
};
// Everything the loader waits for (the hero poster is only a fallback, so it is left out).
const IMAGES = ["exam"].map((s) => `/landing/${s}.jpg`);

const HIGHLIGHTS: { tag: string; color: string; title: string; body: string }[] = [
  { tag: "Library", color: "#A34D00", title: "Every course. Every topic.", body: "Notes matched to your faculty, from Constitutional Law to Land Law, with the cases that matter linked inline." },
  { tag: "Case Law", color: "#0066CC", title: "The judgments, searchable.", body: "Find the ratio, the holding and the dissent without the 80-page scroll." },
  { tag: "AI Assistant", color: "#5856D6", title: "Ask anything about Ghanaian law.", body: "Notified AI answers from Ghanaian law only and points you to the cases, Acts and notes behind each answer." },
  { tag: "Articles", color: "#8F5B00", title: "Plain-English explainers.", body: "Short pieces on the questions Ghanaian law students actually ask, linked to the cases and notes behind them." },
  { tag: "Hot Topics", color: "#D3123F", title: "A podcast on the law in the news.", body: "Each episode links back to the cases, Acts and notes you can study next." },
  { tag: "Exam Prep", color: "#1E7B34", title: "Past questions, expertly marked.", body: "Answer timed questions and get written feedback from an expert marker." },
];

// Mobile: swipeable card rail that bleeds to the screen edges. md+: the normal grid.
const rail = "-mx-[22px] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[22px] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0 md:pb-0";
const railItem = "w-[82%] shrink-0 snap-center md:w-auto";

const h2 = "m-0 font-bold tracking-[-0.035em] leading-[1.07] text-[clamp(36px,5vw,56px)]";
const pill = "flex h-11 items-center justify-center rounded-full px-[22px] text-[17px] no-underline";
const link = "text-[#0066CC] no-underline hover:underline";

function Slot({ src, label }: { src: string; label: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/landing/${src}.jpg`} alt={label} loading="lazy" decoding="async" className="size-full object-cover" />;
}

function Tier({ name, color, price, per, blurb, items, cta, dark, ctaCls, badge }: {
  name: string; color?: string; price: string; per?: string; blurb: string; items: string[];
  cta: string; dark?: boolean; ctaCls: string; badge?: string;
}) {
  const sub = dark ? "text-[#A1A1A6]" : "text-[#6E6E73]";
  return (
    <div className={`${railItem} flex flex-col gap-3 rounded-[28px] p-6 md:gap-[18px] md:p-9 ${dark ? "bg-[#1D1D1F] text-[#F5F5F7]" : "bg-[#F5F5F7]"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-[21px] font-semibold" style={{ color }}>{name}</h3>
        {badge && <div className="text-xs font-semibold text-[#FF9F0A]">{badge}</div>}
      </div>
      <div><span className="text-[32px] font-bold tracking-[-0.03em] md:text-[40px]">{price}</span>{per && <span className={`text-[15px] ${sub}`}> {per}</span>}</div>
      <div className={`text-[15px] ${sub}`}>{blurb}</div>
      <div className={`h-px ${dark ? "bg-white/20" : "bg-black/12"}`} />
      <div className="flex flex-col gap-1.5 text-[15px] md:gap-2.5">{items.map((i) => <div key={i}>{i}</div>)}</div>
      <div className="flex-1" />
      <Link href={SIGNUP} className={`${pill} ${ctaCls}`}>{cta}</Link>
    </div>
  );
}

export default function Landing() {
  const [billing, setBilling] = useState<"month" | "semester">("month");
  const [ready, setReady] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const p = PRICES[billing];

  return (
    <div className="nl-light bg-white text-[17px] leading-[1.47] tracking-[-0.022em] text-[#1D1D1F]" style={{ colorScheme: "light" }}>
      <LandingLoader images={IMAGES} audio={AUDIO_SRC} onReady={(url) => { setAudio(url); setReady(true); }} />
      <SiteNav />

      <main id="main" tabIndex={-1}>
      <div className="mt-5 flex justify-center px-4">
        <a
          href="#pricing"
          className="group flex max-w-full items-center gap-3 rounded-[22px] bg-[#F5F5F7] py-1.5 pl-1.5 pr-4 text-left text-sm leading-snug text-[#1D1D1F]! no-underline transition-colors hover:bg-[#EBEBF0] hover:text-[#1D1D1F]! sm:rounded-full"
        >
          <span className="shrink-0 rounded-full bg-[#1D1D1F] px-3 py-1.5 text-xs font-semibold text-white">For law students</span>
          <span><b className="font-semibold">Try Supreme Justice free for 7 days</b> with your university email</span>
          <span aria-hidden className="shrink-0 text-lg leading-none text-[#6E6E73] transition-transform group-hover:translate-x-0.5">›</span>
        </a>
      </div>

      <section id="top" className="flex flex-col items-center overflow-hidden px-[22px] pt-[72px] text-center">
        <h1 className="max-w-[900px] text-balance text-[clamp(48px,9vw,96px)] font-bold leading-[1.02] tracking-[-0.045em]">The Law at Your Fingertips.</h1>
        <p className="mt-[18px] max-w-[640px] text-pretty text-[clamp(19px,2.2vw,24px)] font-medium leading-[1.35] text-[#6E6E73]">Notes, podcasts and exam prep for every law course, at every level.</p>
        <div className="mt-[30px] flex flex-wrap items-center justify-center gap-6">
          <Link href={SIGNUP} className={`${pill} bg-[#0071E3] text-white! hover:text-white! hover:bg-[#0077ED]`}>Start studying free</Link>
          <a href="#pricing" className={link}>See plans ›</a>
        </div>
        <div className="relative mt-14 aspect-[2/3] w-full max-w-[1080px] overflow-hidden rounded-t-[22px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_30px_80px_rgba(0,0,0,0.14)] md:aspect-video">
          <HeroPromo ready={ready} audioSrc={audio ?? AUDIO_SRC} />
        </div>
      </section>

      <section id="features" aria-labelledby="features-h" className="bg-[#F5F5F7] px-[22px] py-24">
        <div className="mx-auto flex max-w-[1024px] flex-col gap-10">
          <h2 id="features-h" className={h2}>Get the highlights.</h2>
          <div tabIndex={0} role="region" aria-label="Product highlights" className={`${rail} md:grid-cols-2 lg:grid-cols-3`}>
            {HIGHLIGHTS.map((f) => (
              <div key={f.tag} className={`${railItem} flex flex-col overflow-hidden rounded-[28px] bg-white`}>
                <div className="flex flex-col gap-2 px-6 pb-4 pt-6 md:px-8 md:pt-8">
                  <div className="text-sm font-semibold" style={{ color: f.color }}>{f.tag}</div>
                  <h3 className="m-0 text-balance text-[24px] font-bold leading-[1.14] tracking-[-0.025em]">{f.title}</h3>
                  <div className="text-[#6E6E73]">{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="listen" aria-labelledby="listen-h" className="bg-white px-[22px] py-[120px]">
        <div className="mx-auto grid max-w-[1024px] grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] items-center gap-14">
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[21px] font-semibold text-[#D3123F]">Hot Topics Podcast</p>
            <h2 id="listen-h" className={`${h2} text-balance`}>The law behind the week.</h2>
            <p className="m-0 text-pretty text-[19px] text-[#6E6E73]">What people are talking about, and the law behind it. Each episode comes with a write-up on NotifiedLaw.</p>
          </div>
        </div>
      </section>

      <section id="exam" className="overflow-hidden bg-[#F5F5F7] px-[22px] pt-[120px]">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center gap-4 text-center">
          <p className="m-0 text-[21px] font-semibold text-[#1E7B34]">Exam Prep</p>
          <h2 className="m-0 max-w-[820px] text-balance text-[clamp(36px,5.5vw,64px)] font-bold leading-[1.05] tracking-[-0.04em]">Write the answer. Get expert marking.</h2>
          <p className="m-0 max-w-[600px] text-pretty text-[19px] text-[#6E6E73]">Timed past questions, marked by an expert with written feedback on what to fix — before your real examiner sees it.</p>
          <div className="mt-12 aspect-video w-full max-w-[900px] overflow-hidden rounded-t-[22px] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"><Slot src="exam" label="Exam mode — expert marking" /></div>
        </div>
      </section>

      <section id="pricing" aria-labelledby="pricing-h" className="bg-white px-[22px] py-[120px]">
        <div className="mx-auto flex max-w-[1024px] flex-col items-center gap-9">
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 id="pricing-h" className={h2}>Which plan is right for you?</h2>
            <p className="m-0 text-[19px] text-[#6E6E73]">Student pricing. Pay with MTN MoMo, Telecel Cash or AT Money.</p>
          </div>
          <div role="group" aria-label="Billing period" className="flex rounded-full bg-[#E8E8ED] p-[3px]">
            {([["month", "Monthly"], ["semester", "Per semester"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={billing === k} onClick={() => setBilling(k)} className={`h-[34px] rounded-full border-0 px-5 text-sm font-medium text-[#1D1D1F] ${billing === k ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "bg-transparent"}`}>{l}</button>
            ))}
          </div>
          <div tabIndex={0} role="region" aria-label="Plans and pricing" className={`${rail} w-[calc(100%+44px)] max-w-none md:w-full md:grid-cols-3`}>
            <Tier name="Attorney" price="Free" blurb="Try NotifiedLaw with starter content." items={["First 2 topics of every course"]} cta="Start free" ctaCls="border border-[#0066CC] text-[#0066CC]! hover:text-[#0066CC]! hover:bg-[#0066CC]/5" />
            <Tier name="Senior Judicial" color="#0066CC" price={p.pro} per={p.per} blurb="The full library." items={["All topics, at every level"]} cta="Choose Pro" ctaCls="bg-[#0071E3] text-white! hover:text-white! hover:bg-[#0077ED]" />
            <Tier dark name="Supreme Justice" color="#BF5AF2" badge="Most complete" price={p.max} per={p.per} blurb="Everything, including Pre-Bar and the Bar Course." items={["Everything in Senior Judicial", "Pre-Bar and Bar Course notes", "Exam prep questions"]} cta="Choose Max" ctaCls="bg-[#F5F5F7] text-[#1D1D1F]! hover:text-[#1D1D1F]! hover:bg-white" />
          </div>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-h" className="bg-white px-[22px] pb-[120px] pt-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-9">
          <h2 id="faq-h" className={h2}>Questions, answered.</h2>
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

      </main>

      <footer className="bg-[#F5F5F7] px-[22px] pb-8 text-xs text-[#6E6E73]">
        <nav aria-label="Site" className="mx-auto flex max-w-[1024px] flex-wrap gap-x-5 gap-y-2 border-t-[0.5px] border-black/15 py-[18px]">
          {[["Library", "/library"], ["Articles", "/articles"], ["Case Law", "/case-law"], ["Pricing", "#pricing"], ["Sign in", LOGIN], ["Create account", SIGNUP]].map(([l, h]) => <a key={l} href={h} className="text-[#424245]! no-underline hover:text-[#424245]! hover:underline">{l}</a>)}
        </nav>
        <div className="mx-auto flex max-w-[1024px] flex-wrap justify-between gap-x-6 gap-y-3 border-t-[0.5px] border-black/15 pt-[18px]">
          <span>Copyright © 2026 NotifiedLaw. All rights reserved.</span>
          <div className="flex flex-wrap gap-5">
            {[["Privacy", "/privacy"], ["Terms", "/terms-of-service"], ["Support", "mailto:notifiedlaw@gmail.com"]].map(([l, h]) => <a key={l} href={h} className="text-[#424245]! no-underline hover:text-[#424245]! hover:underline">{l}</a>)}
            <span>Accra, Ghana</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
