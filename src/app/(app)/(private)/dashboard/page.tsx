import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Empty } from "@/components/ui";
import { getDb, getSession } from "@/lib/auth";
import { getCourses } from "@/lib/cms";
import { profile } from "@/db/schema";
import { abbr, LEVEL_LABEL, type Level } from "@/lib/data";

export const metadata = { title: "Home" };

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

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-9 px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 md:gap-10 md:px-10 md:pt-9">
      <header>
        <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted">{date}</div>
        <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-[-0.03em] md:text-5xl">Akwaaba, {first}</h1>
      </header>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">{LEVEL_LABEL[level]} courses</h2>
          <Link href="/library" className="text-[13px]">See all levels</Link>
        </div>
        {courses.length === 0 ? (
          <Empty title={`No courses for ${LEVEL_LABEL[level]} yet`}>Courses appear here once they are published.</Empty>
        ) : (
          /* Phones: swipeable row that bleeds to the screen edge. sm+: grid. */
          <div className="-mx-5 flex snap-x snap-mandatory scroll-pl-5 gap-3.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
            {courses.map((c) => (
              <Link
                key={c.slug}
                href={`/library/${c.slug}`}
                className="flex w-[72%] shrink-0 snap-start flex-col gap-3 overflow-hidden rounded-2xl bg-surface px-4 pb-4 shadow-card transition-shadow hover:shadow-card-hover sm:w-auto"
                style={link}
              >
                <div className="-mx-4 h-[72px]" style={{ background: `linear-gradient(135deg, ${c.color}33, ${c.color}0d)` }} />
                <div className="relative -mt-9 flex size-11 items-center justify-center rounded-xl border-[3px] border-surface text-[15px] font-bold text-white" style={{ background: c.color }}>
                  {abbr(c.title)}
                </div>
                <div className="min-h-[38px] text-[15px] font-semibold leading-tight">{c.title}</div>
                <div className="text-xs text-muted">{c.topics.length} topics · {c.topics.filter((t) => t.ready).length} available</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
