import Link from "next/link";
import { Icon } from "@/components/icons";
import { abbr, COURSES, DEMO_USER, QUOTE } from "@/lib/data";

export const metadata = { title: "Home" };

const Eyebrow = ({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) => (
  <div
    className="text-xs font-semibold uppercase tracking-[0.05em]"
    style={{ color }}
  >
    {children}
  </div>
);

export default function Home() {
  const courses = COURSES[DEMO_USER.level];
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-7 px-5 pb-12 pt-6 lg:px-10 lg:pt-9">
      <div className="flex flex-col gap-3.5 pb-2 pt-2 lg:pt-5">
        <h1 className="text-balance max-w-[900px] text-[44px] font-bold leading-[0.98] tracking-[-0.05em] sm:text-7xl lg:text-[84px]">
          The Law at Your Fingertips.
        </h1>
        <p className="text-pretty max-w-[620px] text-lg font-medium leading-snug tracking-[-0.01em] text-muted lg:text-[21px]">
          Notes, podcasts and exam prep for every law course, Level 100 to 300.
        </p>
      </div>

      <section className="flex flex-col gap-2.5 rounded-2xl bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.06)]">
        <Eyebrow color="#ff9f0a">Quote of the day</Eyebrow>
        <p className="text-pretty text-xl font-medium leading-snug tracking-[-0.01em]">
          {QUOTE.text}
        </p>
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{QUOTE.by}</span> · {QUOTE.role}
        </p>
      </section>

      <div>
        <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">
          Monday, 26 October
        </div>
        <div className="mt-1 text-3xl font-bold tracking-[-0.02em]">
          Akwaaba, {DEMO_USER.first}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="relative flex min-h-60 flex-col gap-[18px] overflow-hidden rounded-2xl bg-ink-dark p-7 text-white">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://commons.wikimedia.org/wiki/Special:FilePath/Supreme_Court%2C_Accra_(IMG_20230201_140723_1).jpg?width=1600)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(28,28,30,0.94) 0%, rgba(28,28,30,0.82) 55%, rgba(28,28,30,0.35) 100%)",
            }}
          />
          <div className="relative">
            <Eyebrow color="#ff9f0a">Continue reading</Eyebrow>
          </div>
          <div className="relative">
            <div className="text-pretty text-[26px] font-bold leading-[1.15] tracking-[-0.015em]">
              Judicial Review &amp; the Supremacy of the Constitution
            </div>
            <div className="mt-2 text-sm text-white/60">
              Constitutional Law II · Topic 1 · 6 min left
            </div>
          </div>
          <div className="relative h-1 rounded-sm bg-white/15">
            <div className="h-full w-[62%] rounded-sm bg-amber-soft" />
          </div>
          <div className="flex-1" />
          <div className="relative flex flex-wrap gap-2.5">
            <Link
              href="/library/law-201/1"
              className="flex h-9 items-center rounded-full bg-white px-[18px] text-sm font-semibold"
              style={{ color: "#1d1d1f", textDecoration: "none" }}
            >
              Resume
            </Link>
            <Link
              href="/library/law-201/1?tab=listen"
              className="flex h-9 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium"
              style={{ color: "#fff", textDecoration: "none" }}
            >
              <Icon name="headphones" size={14} />
              Listen as podcast · 18 min
              {DEMO_USER.plan !== "Pro Max" && <Icon name="lock" size={12} />}
            </Link>
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <Link
            href="/flashcards"
            className="flex flex-1 flex-col gap-1.5 rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Eyebrow color="#af52de">Flashcards</Eyebrow>
            <div className="text-[22px] font-bold">24 cards due today</div>
            <div className="text-[13px] text-muted">
              Judicial Review · Negligence · Mens Rea
            </div>
            <div className="flex-1" />
            <div className="text-[13px] font-semibold text-blue">Start review</div>
          </Link>
          <Link
            href="/ai"
            className="flex flex-1 flex-col gap-2.5 rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="flex items-center gap-1.5">
              <Eyebrow color="#5856d6">Notified AI</Eyebrow>
              {DEMO_USER.plan !== "Pro Max" && (
                <span className="rounded bg-indigo/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo">
                  SUPREME JUSTICE
                </span>
              )}
            </div>
            <div className="flex h-[38px] items-center rounded-[10px] bg-fill px-3.5 text-sm text-muted">
              Ask about any case, article or statute…
            </div>
            <div className="text-xs text-muted">
              Try “Explain Article 2 vs Article 33”
            </div>
          </Link>
        </div>
      </div>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Your Level {DEMO_USER.level} courses</h2>
          <Link href="/library" className="text-[13px]">
            See all levels
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {courses.map((c) => (
            <Link
              key={c.slug}
              href={`/library/${c.slug}`}
              className="flex flex-col gap-3.5 overflow-hidden rounded-[14px] bg-white px-[18px] pb-[18px] shadow-card transition-shadow hover:shadow-card-hover"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="-mx-[18px] h-[116px]"
                style={{
                  background: `linear-gradient(135deg, ${c.color}33, ${c.color}0d)`,
                }}
              />
              <div
                className="relative -mt-9 flex size-11 items-center justify-center rounded-xl border-[3px] border-white text-[15px] font-bold text-white"
                style={{ background: c.color }}
              >
                {abbr(c.code)}
              </div>
              <div className="min-h-[38px] text-[15px] font-semibold leading-tight">
                {c.title}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-1 rounded-sm bg-track">
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${c.progress * 100}%`, background: c.color }}
                  />
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
