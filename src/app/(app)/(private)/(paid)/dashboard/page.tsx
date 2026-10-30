import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Chevron, Empty } from "@/components/ui";
import { getDb, getSession } from "@/lib/auth";
import { getArticles, getCourses } from "@/lib/cms";
import { dailyQuote } from "@/lib/quotes";
import { profile } from "@/db/schema";
import { bySemester, LEVEL_LABEL, type Level } from "@/lib/data";

export const metadata = { title: "Home" };

const link = { textDecoration: "none", color: "inherit" } as const;

export default async function Home() {
  const session = await getSession();
  const [p] = session ? await getDb().select().from(profile).where(eq(profile.userId, session.user.id)) : [];
  // New sign-ins have no profile yet; send them through onboarding first.
  if (session && !p) redirect("/onboarding");
  const first = p?.firstName || session?.user.name.trim().split(/\s+/)[0] || "there";
  const level = (p?.level ?? "200") as Level;
  const [courses, quote, latest] = await Promise.all([
    getCourses().then((c) => c[level]),
    dailyQuote(),
    getArticles().then((a) => [...a].sort((x, y) => (y.date?.getTime() ?? 0) - (x.date?.getTime() ?? 0))[0]).catch(() => undefined),
  ]);
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Accra" }).format(new Date());

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-9 px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 md:gap-10 md:px-10 md:pt-9">
      <header>
        <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{date}</div>
        <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.03em] md:text-5xl">Akwaaba, {first}</h1>
        {quote && (
          <figure className="m-0 mt-4 max-w-[640px] border-l-[3px] border-amber pl-4">
            <blockquote className="m-0 text-[17px] leading-snug text-ink">“{quote.text}”</blockquote>
            <figcaption className="mt-1.5 text-[13px] text-muted">{quote.author}{quote.source ? `, ${quote.source}` : ""}</figcaption>
          </figure>
        )}
      </header>

      {latest && (
        <section className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[22px] font-bold tracking-[-0.02em]">Latest in articles</h2>
            <Link href="/articles" className="text-[13px]">See all</Link>
          </div>
          <Link href={`/articles/${latest.slug}`} className="group flex flex-col overflow-hidden rounded-[22px] bg-surface shadow-card transition-transform duration-300 active:scale-[0.98] sm:flex-row" style={link}>
            <span className="relative block aspect-video overflow-hidden sm:aspect-auto sm:w-[44%] sm:min-h-[200px] sm:shrink-0">
              {latest.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latest.image} alt="" width={1280} height={720} decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              ) : (
                <span aria-hidden className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#ff9f0a]/25 via-[#af52de]/15 to-[#007aff]/25 text-5xl font-bold text-muted/50">{latest.title[0]}</span>
              )}
            </span>
            <span className="flex flex-1 flex-col justify-center gap-2 p-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#ff9f0a]">New{latest.industry ? ` · ${latest.industry}` : ""}</span>
              <span className="text-balance text-[20px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[22px]">{latest.title}</span>
              {latest.summary && <span className="line-clamp-2 text-[15px] leading-snug text-muted">{latest.summary}</span>}
              <span className="flex items-center justify-between pt-1 text-xs text-faint">
                <span>{[latest.date && new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(latest.date), `${latest.mins} min read`].filter(Boolean).join(" · ")}</span>
                <span className="font-semibold text-link">Read <span aria-hidden>→</span></span>
              </span>
            </span>
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">{LEVEL_LABEL[level]} courses</h2>
          <Link href="/library" className="text-[13px]">See all levels</Link>
        </div>
        {courses.length === 0 ? (
          <Empty title={`No courses for ${LEVEL_LABEL[level]} yet`}>Courses appear here once they are published.</Empty>
        ) : (
          <div className="flex flex-col gap-7">
            {bySemester(courses).map((sem) => (
              <div key={sem.semester} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3 border-b-[0.5px] border-edge/15 pb-2">
                  <h3 className="m-0 text-[17px] font-semibold tracking-[-0.01em]">{sem.label}</h3>
                  <span className="text-[13px] text-muted">{sem.courses.length} {sem.courses.length === 1 ? "course" : "courses"}</span>
                </div>
                {/* Phones: a stacked list so every course is in view. sm+: grid. */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                  {sem.courses.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/library/${c.slug}`}
                      className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 shadow-card transition-shadow hover:shadow-card-hover active:opacity-70 sm:p-4"
                      // The course colour as a light wash over the card, matching its title colour in the Library.
                      style={{ ...link, backgroundImage: `linear-gradient(${c.color}1f, ${c.color}0a)` }}
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="text-[15px] font-semibold leading-tight sm:min-h-[38px]">{c.title}</div>
                        <div className="text-xs text-muted">{c.topics.length} topics · {c.topics.filter((t) => t.ready).length} available</div>
                      </div>
                      <Chevron />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
