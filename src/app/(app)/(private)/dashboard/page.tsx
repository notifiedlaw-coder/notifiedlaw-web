import Link from "next/link";
import { Icon } from "@/components/icons";
import { ShowIfFree, ShowUnlessMax } from "@/components/plan";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, getSession } from "@/lib/auth";
import { getCourses } from "@/lib/cms";
import { profile } from "@/db/schema";
import { abbr, LEVEL_LABEL, QUOTE, type Level } from "@/lib/data";

export const metadata = { title: "Home" };

const Eyebrow = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-[0.05em]" style={{ color }}>
    {children}
  </div>
);

const Heading = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between">
    <h2 className="text-[22px] font-bold tracking-[-0.02em]">{children}</h2>
    {right}
  </div>
);

const Chevron = () => (
  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint sm:hidden" aria-hidden>
    <path d="M1 1l6 6-6 6" />
  </svg>
);

const link = { textDecoration: "none", color: "inherit" } as const;

export default async function Home() {
  const session = await getSession();
  const [p] = session ? await getDb().select().from(profile).where(eq(profile.userId, session.user.id)) : [];
  // New sign-ins have no profile yet; send them through onboarding first.
  if (session && !p) redirect("/onboarding");
  const first = p?.firstName || session?.user.name.trim().split(/\s+/)[0] || "there";
  const level = (p?.level ?? "200") as Level;
  const courses = (await getCourses())[level];
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Accra" }).format(new Date());

  // One list on phones (iOS-style grouped rows), three tiles from sm up.
  const today = [
    { href: "/flashcards", icon: "cards", color: "#af52de", title: "24 cards due", sub: "Judicial Review · Negligence · Mens Rea" },
    { href: "/ai", icon: "sparkle", color: "#5856d6", title: "Ask Notified AI", sub: "Any case, article or statute", tag: true },
    { href: "/hot-topics", icon: "headphones", color: "#ff9500", title: "Passport withheld? Where do you actually sue?", sub: "Hot Topics · New episode · 17 min" },
  ];

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-9 px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 md:gap-10 md:px-10 md:pt-9">
      <header>
        <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{date}</div>
        <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.03em] md:text-5xl">Akwaaba, {first}</h1>
        <figure className="m-0 mt-5 flex max-w-[560px] gap-3.5">
          <span aria-hidden className="w-[3px] shrink-0 rounded-full bg-amber-soft" />
          <div className="flex flex-col gap-1.5">
            <blockquote className="m-0 text-pretty text-[17px] font-medium leading-snug tracking-[-0.01em]">
              “{QUOTE.text}”
            </blockquote>
            <figcaption className="text-[13px] text-muted">
              <span className="font-semibold text-ink">{QUOTE.by}</span> · {QUOTE.role}
            </figcaption>
          </div>
        </figure>
      </header>

      <section aria-label="Continue reading" className="relative flex flex-col gap-5 overflow-hidden rounded-[28px] bg-ink-dark p-5 text-white sm:p-6 md:p-8">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(/photos/supreme-court-accra.jpg)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(28,28,30,0.94) 0%, rgba(28,28,30,0.82) 55%, rgba(28,28,30,0.35) 100%)" }}
        />
        <div className="relative">
          <Eyebrow color="#ff9f0a">Continue reading</Eyebrow>
        </div>
        <div className="relative max-w-[640px]">
          <div className="text-pretty text-[26px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[32px]">
            Judicial Review &amp; the Supremacy of the Constitution
          </div>
          <div className="mt-2.5 text-sm text-white/70">Constitutional Law II · Topic 1 · 6 min left</div>
        </div>
        <div className="relative flex items-center gap-3 md:max-w-[640px]">
          <div className="h-1 flex-1 rounded-sm bg-white/15">
            <div className="h-full w-[62%] rounded-sm bg-amber-soft" />
          </div>
          <span className="text-xs font-medium tabular-nums text-white/65">62%</span>
        </div>
        <div className="relative flex items-center gap-3">
          <Link
            href="/library/law-201/1"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#fff] px-6 text-[15px] font-semibold sm:flex-none"
            style={{ color: "#1d1d1f", textDecoration: "none" }}
          >
            Resume
          </Link>
          <Link
            href="/library/law-201/1?tab=listen"
            className="flex h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-[15px] font-medium"
            style={{ color: "#fff", textDecoration: "none" }}
            aria-label="Listen as podcast, 18 minutes"
          >
            <Icon name="headphones" size={16} />
            <span className="hidden sm:inline">Listen · 18 min</span>
            <ShowUnlessMax><Icon name="lock" size={12} /></ShowUnlessMax>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <Heading>Today</Heading>
        <div className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:bg-transparent sm:shadow-none">
          {today.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="relative flex min-h-[72px] items-center gap-3.5 px-4 py-3.5 transition-colors not-last:after:absolute not-last:after:bottom-0 not-last:after:left-[70px] not-last:after:right-0 not-last:after:h-[0.5px] not-last:after:bg-edge/20 active:bg-edge/5 sm:not-last:after:hidden sm:active:bg-surface sm:flex-col sm:items-start sm:gap-3 sm:rounded-2xl sm:bg-surface sm:p-5 sm:shadow-card sm:hover:shadow-card-hover"
              style={link}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: t.color }}>
                <Icon name={t.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-base font-semibold leading-snug sm:text-[15px]">{t.title}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted sm:line-clamp-2">
                  {t.sub}
                  {t.tag && (
                    <ShowIfFree>
                      <span className="ml-1.5 rounded bg-indigo/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo">NOTIFY CREDITS</span>
                    </ShowIfFree>
                  )}
                </span>
              </span>
              <Chevron />
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <Heading
          right={<Link href="/library" className="text-[13px]">See all levels</Link>}
        >
          {LEVEL_LABEL[level]} courses
        </Heading>
        {/* Phones: swipeable row that bleeds to the screen edge. sm+: grid. */}
        <div className="-mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-3.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
          {courses.map((c) => (
            <Link
              key={c.slug}
              href={`/library/${c.slug}`}
              className="flex w-[72%] shrink-0 snap-start flex-col gap-3 overflow-hidden rounded-2xl bg-surface px-4 pb-4 shadow-card transition-shadow hover:shadow-card-hover sm:w-auto"
              style={link}
            >
              <div className="-mx-4 h-[72px]" style={{ background: `linear-gradient(135deg, ${c.color}33, ${c.color}0d)` }} />
              <div
                className="relative -mt-9 flex size-11 items-center justify-center rounded-xl border-[3px] border-surface text-[15px] font-bold text-white"
                style={{ background: c.color }}
              >
                {abbr(c.code)}
              </div>
              <div className="min-h-[38px] text-[15px] font-semibold leading-tight">{c.title}</div>
              <div className="flex flex-col gap-1.5">
                <div className="h-1 rounded-sm bg-track">
                  <div className="h-full rounded-sm" style={{ width: `${c.progress * 100}%`, background: c.color }} />
                </div>
                <div className="text-xs text-muted">
                  {c.topics.length} topics · {Math.round(c.progress * 100)}% complete
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
