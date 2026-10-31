import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Empty } from "@/components/ui";
import { getDb, getSession } from "@/lib/auth";
import { getArticles, getCourses } from "@/lib/cms";
import { completedTopics } from "@/lib/progress";
import { dailyQuote } from "@/lib/quotes";
import { profile } from "@/db/schema";
import { LEVEL_LABEL, type Course, type Level } from "@/lib/data";

export const metadata = { title: "Today" };

const link = { textDecoration: "none", color: "inherit" } as const;
const eyebrow = "text-[12px] font-semibold uppercase tracking-[0.08em]";

/** Where a course picks up: its first published topic not yet studied, and how far through it is. */
function resume(c: Course, done: Set<string>) {
  const ready = c.topics.filter((t) => t.ready);
  const read = ready.filter((t) => done.has(t.id)).length;
  const at = c.topics.findIndex((t) => t.ready && !done.has(t.id));
  return at < 0 ? null : { course: c, topic: c.topics[at], n: at + 1, total: c.topics.length, read, ready: ready.length };
}

export default async function Today() {
  const session = await getSession();
  const [p] = session ? await getDb().select().from(profile).where(eq(profile.userId, session.user.id)) : [];
  // New sign-ins have no profile yet; send them through onboarding first.
  if (session && !p) redirect("/onboarding");
  const first = p?.firstName || session?.user.name.trim().split(/\s+/)[0] || "there";
  const level = (p?.level ?? "200") as Level;
  const [courses, done, quote, latest] = await Promise.all([
    getCourses().then((c) => c[level]),
    session ? completedTopics(session.user.id).then((ids) => new Set(ids)) : Promise.resolve(new Set<string>()),
    dailyQuote(),
    getArticles().then((a) => [...a].sort((x, y) => (y.date?.getTime() ?? 0) - (x.date?.getTime() ?? 0))[0]).catch(() => undefined),
  ]);
  const date = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Accra" }).format(new Date());

  // Hick's law: one thing to do next, then at most three more. Courses already under way come first.
  const open = courses.map((c) => resume(c, done)).filter((r) => r !== null).sort((a, b) => Number(b.read > 0) - Number(a.read > 0));
  const [next, ...rest] = open;
  const upNext = rest.slice(0, 3);
  const line = next
    ? next.read > 0
      ? `You have read ${next.read} of ${next.ready} topics in ${next.course.title}. One session today keeps you moving.`
      : `Your first topic in ${next.course.title} is ready.`
    : `You are up to date with every ${LEVEL_LABEL[level]} topic published so far.`;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-[18px] pb-8 pt-5 md:px-8 md:pb-10 md:pt-7 lg:px-14 lg:pb-14 lg:pt-10">
      <header className="flex flex-col gap-2">
        <div className={`${eyebrow} text-faint`}>{date}</div>
        <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">Akwaaba, {first}.</h1>
        <p className="m-0 max-w-[600px] text-pretty text-[18px] leading-normal text-muted">{line}</p>
      </header>

      {courses.length === 0 ? (
        <Empty title={`No courses for ${LEVEL_LABEL[level]} yet`}>Courses appear here once they are published.</Empty>
      ) : (
        <div className={`grid items-stretch gap-5 ${upNext.length ? "sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : ""}`}>
          {next ? (
            <Link href={`/library/${next.course.slug}/${next.n}`} className="flex min-h-[240px] flex-col gap-3 rounded-[22px] bg-[#23305C] p-7 text-[#F6F5F2]! hover:bg-[#1F2B54]" style={{ textDecoration: "none" }}>
              <span className={`${eyebrow} text-[#C5CDE6]`}>{next.read > 0 ? "Continue reading" : "Start reading"}</span>
              <span className="text-balance font-display text-[34px] leading-[1.05] md:text-[36px]">{next.topic.title}</span>
              <span className="text-[16px] text-[#C5CDE6]">{next.course.title} · Topic {next.n} of {next.total}</span>
              <span className="flex-1" />
              <span className="h-1.5 overflow-hidden rounded-full bg-[#F6F5F2]/20" role="progressbar" aria-label={`${next.read} of ${next.ready} topics read`} aria-valuemin={0} aria-valuemax={next.ready} aria-valuenow={next.read}>
                <span className="block h-full bg-[#E0683A]" style={{ width: `${next.ready ? Math.round((next.read / next.ready) * 100) : 0}%` }} />
              </span>
              <span className="flex h-[46px] items-center self-start rounded-full bg-[#F6F5F2] px-5 text-[16px] font-semibold text-[#23305C]">
                {next.read > 0 ? "Resume" : "Start"} · {next.topic.mins} min <span aria-hidden className="ml-1">→</span>
              </span>
            </Link>
          ) : (
            <Link href="/library" className="flex min-h-[240px] flex-col justify-center gap-3 rounded-[22px] bg-[#23305C] p-7 text-[#F6F5F2]!" style={{ textDecoration: "none" }}>
              <span className={`${eyebrow} text-[#C5CDE6]`}>All caught up</span>
              <span className="font-display text-[34px] leading-[1.05]">Review what you have read</span>
              <span className="text-[16px] text-[#C5CDE6]">Open the Library →</span>
            </Link>
          )}
          {upNext.length > 0 && <div className="flex flex-col rounded-[22px] border border-edge/10 bg-surface p-2">
            <div className={`${eyebrow} px-3.5 pb-1.5 pt-3.5 text-faint`}>Up next</div>
            {upNext.map((u) => (
              <Link key={u.course.slug} href={`/library/${u.course.slug}/${u.n}`} className="flex min-h-[68px] items-center gap-3.5 rounded-[14px] px-3.5 py-2.5 hover:bg-hover" style={link}>
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: u.course.color }} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[16px] font-semibold">{u.course.title}</span>
                  <span className="truncate text-[14px] text-faint">Topic {u.n} · {u.topic.title}</span>
                </span>
                <span aria-hidden className="text-[20px] text-faint">›</span>
              </Link>
            ))}
          </div>}
        </div>
      )}

      {(quote || latest) && (
        <div className="grid items-start gap-5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {quote && (
            <figure className="m-0 flex flex-col gap-3 rounded-[22px] bg-peach p-7">
              <span aria-hidden className="h-7 font-display text-[64px] leading-[0.5] text-amber">“</span>
              <blockquote className="m-0 font-display text-[24px] leading-[1.25]">{quote.text}</blockquote>
              <figcaption className="text-[14px] text-muted">{quote.author}{quote.source ? `, ${quote.source}` : ""}</figcaption>
            </figure>
          )}
          {latest && (
            <Link href={`/articles/${latest.slug}`} className="group flex flex-col overflow-hidden rounded-[22px] border border-edge/10 bg-surface" style={link}>
              {latest.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latest.image} alt="" width={1280} height={560} decoding="async" className="block aspect-[16/7] w-full object-cover" />
              )}
              <span className="flex flex-col gap-1.5 px-5 py-[18px]">
                <span className={`${eyebrow} font-bold text-plum`}>New article{latest.industry ? ` · ${latest.industry}` : ""}</span>
                <span className="text-balance font-display text-[24px] leading-[1.15]">{latest.title}</span>
                <span className="text-[14px] text-faint">{latest.mins} min read</span>
              </span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
