import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Chevron, Empty } from "@/components/ui";
import { getDb, getSession } from "@/lib/auth";
import { getCourses } from "@/lib/cms";
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
  const [courses, quote] = await Promise.all([getCourses().then((c) => c[level]), dailyQuote()]);
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
