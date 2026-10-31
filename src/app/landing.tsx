import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/app-shell";
import { SiteNav } from "@/components/site-nav";
import { PLAN_PRICES, cedis } from "@/lib/content";
import { CREDIT_NAME, PLAN_CREDITS } from "@/lib/data";
import { FAQ } from "@/lib/site";

const LOGIN = "/login";
const SIGNUP = "/signup";

// Hick's law: three pillars instead of six feature cards, and one primary action per section.
const PILLARS = [
  { n: "I", t: "Learn", d: "Notes for every course, flashcards, a study timetable and expertly marked exam answers." },
  { n: "II", t: "Research", d: "Case briefs, explainers, a podcast on the law in the news, and an AI that answers from Ghanaian law only." },
  { n: "III", t: "Connect", d: "Friends, study groups and messages with the people learning the law alongside you." },
];

const TIERS = [
  { name: "Student", price: cedis(PLAN_PRICES.Student), blurb: "The full library, Levels 100 to 400.", items: ["Every topic, Levels 100 to 400", `${PLAN_CREDITS.Student} ${CREDIT_NAME} a month`, "Flashcards and timetable", "Friends, group chats and study calls", "500 MB of file storage"] },
  { name: "Senior Judicial", price: cedis(PLAN_PRICES.Pro), blurb: "The full library, with Notified AI to help it stick.", items: ["Everything in Student", `${PLAN_CREDITS.Pro} ${CREDIT_NAME} a month`, "Weekly quiz leaderboard", "5 GB of file storage"], rec: true },
  { name: "Supreme Justice", price: cedis(PLAN_PRICES["Pro Max"]), blurb: "Everything, including Pre-Bar and the Bar Course.", items: ["Everything in Senior Judicial", `${PLAN_CREDITS["Pro Max"]} ${CREDIT_NAME} a month`, "Pre-Bar and Bar Course notes", "Exam prep questions", "10 GB of file storage"] },
];

const wrap = "mx-auto max-w-[1200px] px-[18px] md:px-8";
const section = "py-14 md:py-[72px] lg:py-24";
const h2 = "m-0 font-display text-[36px] leading-[1.05] md:text-[44px] lg:text-[54px]";
const primary = "inline-flex h-[52px] items-center rounded-full bg-[#23305C] px-7 text-[17px] font-semibold text-[#F6F5F2]! no-underline hover:bg-[#1B2649] hover:text-[#F6F5F2]! hover:no-underline";

export default function Landing() {
  return (
    <div className="nl-light nl-scale bg-[#F6F5F2] text-[17px] leading-normal text-[#161A26]" style={{ colorScheme: "light" }}>
      <SiteNav />

      <main id="main" tabIndex={-1}>
        <section id="top" className={`${wrap} grid items-center gap-12 pb-14 pt-10 md:pb-[72px] md:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pb-24 lg:pt-[72px]`}>
          <div className="flex flex-col gap-6">
            <span className="self-start rounded-full bg-[#E4E8F3] px-3.5 py-1.5 text-[14px] font-semibold text-[#23305C]">For Ghana&rsquo;s law students</span>
            <h1 className="m-0 text-balance font-display text-[52px] leading-[0.98] tracking-[-0.02em] md:text-[72px] lg:text-[88px]">
              The law, learned <i className="text-[#23305C]">together.</i>
            </h1>
            <p className="m-0 max-w-[540px] text-pretty text-[20px] leading-normal text-[#555B6B]">
              Notes, case briefs and an AI tutor for every course from Level 100 to the Bar, with classmates to learn alongside.
            </p>
            <div className="flex flex-wrap items-center gap-5">
              <Link href={SIGNUP} className={primary}>Start studying</Link>
              <a href="#pricing" className="text-[17px] font-semibold text-[#23305C]! no-underline hover:underline">See plans →</a>
            </div>
            <div className="text-[14px] text-[#636978]">Levels 100–400 · Pre-Bar · Bar Course</div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-[#D5D8E0] lg:aspect-[4/5]">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static photo; see public/photos/CREDITS.txt */}
            <img src="/photos/supreme-court-accra.jpg" alt="The Supreme Court of Ghana, Accra" width={1280} height={948} fetchPriority="high" className="block size-full object-cover" />
            <div className="absolute bottom-4 left-4 max-w-[300px] rounded-[14px] bg-[#F6F5F2] px-4 py-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#636978]">Today&rsquo;s brief</div>
              <div className="mt-1 font-display text-[22px] leading-[1.15]"><i>Tuffuor v Attorney-General</i></div>
              <div className="mt-0.5 text-[14px] text-[#555B6B]">[1980] GLR 637 · Good law</div>
            </div>
          </div>
        </section>

        <section id="pillars" aria-labelledby="pillars-h" className="border-y border-[#161A26]/[0.08] bg-white">
          <div className={`${wrap} ${section} flex flex-col gap-10`}>
            <h2 id="pillars-h" className={`${h2} max-w-[640px]`}>Three things, done well.</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
              {PILLARS.map((p) => (
                <div key={p.n} className="flex flex-col gap-3 rounded-[18px] bg-[#F6F5F2] p-7">
                  <div className="font-display text-[56px] leading-none text-[#C4552B]">{p.n}</div>
                  <h3 className="m-0 font-display text-[30px] font-normal">{p.t}</h3>
                  <p className="m-0 text-pretty text-[17px] leading-normal text-[#555B6B]">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="audience" aria-label="Who it is for" className={`${wrap} ${section} grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5`}>
          <div className="flex flex-col gap-4 rounded-[22px] bg-[#23305C] p-7 text-[#F6F5F2] md:p-9">
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#C5CDE6]">For law students</div>
            <h3 className="m-0 font-display text-[38px] font-normal leading-[1.05]">From first lecture to the Bar exam.</h3>
            <div className="flex flex-col gap-2 text-[17px] text-[#E4E8F3]"><span>Notes matched to your faculty outline</span><span>Flashcards and expertly marked exam answers</span><span>Study groups with your classmates</span></div>
            <Link href={SIGNUP} className="mt-2 inline-flex h-12 items-center self-start rounded-full bg-[#F6F5F2] px-[22px] text-[16px] font-semibold text-[#23305C]! no-underline hover:no-underline">Start as a student</Link>
          </div>
          <div className="flex flex-col gap-4 rounded-[22px] bg-[#161A26] p-7 text-[#F6F5F2] md:p-9">
            <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F0A27E]">Hot Topics podcast</div>
            <h3 className="m-0 font-display text-[38px] font-normal leading-[1.05]">The law behind the week.</h3>
            <div className="flex flex-col gap-2 text-[17px] text-[#CFD3DE]"><span>What people in Accra are talking about</span><span>The cases and Acts behind each story</span><span>A write-up with every episode</span></div>
            <Link href={SIGNUP} className="mt-2 inline-flex h-12 items-center self-start rounded-full bg-[#E0683A] px-[22px] text-[16px] font-semibold text-[#161A26]! no-underline hover:no-underline">Listen on NotifiedLaw</Link>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-h" className="border-t border-[#161A26]/[0.08] bg-white">
          <div className={`${wrap} ${section} flex flex-col gap-9`}>
            <div className="flex flex-col gap-2.5">
              <h2 id="pricing-h" className={h2}>One plan is right for most people.</h2>
              <p className="m-0 text-[18px] text-[#555B6B]">Billed monthly. Pay with MTN MoMo, Telecel Cash or AT Money.</p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-stretch gap-5">
              {TIERS.map((t) => (
                <div key={t.name} className={`flex flex-col gap-3.5 rounded-[20px] p-7 ${t.rec ? "bg-[#23305C] text-[#F6F5F2]" : "border border-[#161A26]/10 bg-[#F6F5F2]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 text-[20px] font-semibold">{t.name}</h3>
                    {t.rec && <span className="rounded-full bg-[#E0683A] px-2.5 py-1 text-[12px] font-bold text-[#161A26]">Recommended</span>}
                  </div>
                  <div><span className="font-display text-[48px] leading-none">{t.price}</span><span className="text-[15px] opacity-75"> / month</span></div>
                  <p className="m-0 text-[16px] opacity-80">{t.blurb}</p>
                  <div className="h-px bg-current opacity-15" />
                  <div className="flex flex-col gap-2 text-[16px]">{t.items.map((i) => <span key={i}>{i}</span>)}</div>
                  <div className="flex-1" />
                  <Link
                    href={SIGNUP}
                    className={`flex h-12 items-center justify-center rounded-full text-[16px] font-semibold no-underline hover:no-underline ${t.rec ? "bg-[#F6F5F2] text-[#23305C]!" : "border border-[#23305C] text-[#23305C]! hover:bg-[#23305C]/5"}`}
                  >
                    Choose {t.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-h" className={`mx-auto flex max-w-[800px] flex-col gap-7 px-[18px] md:px-8 ${section}`}>
          <h2 id="faq-h" className={h2}>Questions, answered.</h2>
          <div className="flex flex-col">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-t border-[#161A26]/[0.14] py-5 last:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-semibold">
                  {f.q}
                  <span className="text-[#636978] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="m-0 mt-3 text-[17px] leading-[1.55] text-[#555B6B]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#161A26] text-[#CFD3DE]">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-6 py-12`}>
          <Link href="/#top" className="flex items-center gap-2.5 text-[#F6F5F2]! no-underline hover:no-underline">
            <LogoMark ring="#161A26" />
            <Wordmark className="text-[28px]" />
          </Link>
          <nav aria-label="Site" className="flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
            {[["Articles", "/articles"], ["Case law", "/case-law"], ["Sign in", LOGIN], ["Privacy", "/privacy"], ["Terms", "/terms-of-service"], ["Support", "mailto:notifiedlaw@gmail.com"]].map(([l, h]) => (
              <a key={l} href={h} className="text-[#CFD3DE]! no-underline hover:text-[#F6F5F2]! hover:underline">{l}</a>
            ))}
            <span>Accra, Ghana</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
