import Link from "next/link";
import { Chevron, Page, Title, cardCls } from "@/components/ui";
import { getEpisodes } from "@/lib/cms";
import { MOCK_EPISODES } from "./mock";
import { Podcast } from "./podcast";

export const metadata = { title: "Hot Topics Podcast" };

// Write-ups come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(d) : "");

export default async function HotTopicsPage() {
  const episodes = await getEpisodes();
  return (
    <Page max={960}>
      <Title title="Hot Topics Podcast" sub="What Accra is talking about, and the law behind it. Every episode links to the cases, Acts and notes it cites." />
      <Podcast episodes={MOCK_EPISODES} />
      {episodes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">Write-ups</h2>
          <div className={`${cardCls} overflow-hidden`}>
            {episodes.map((e) => (
              <Link key={e.slug} href={`/hot-topics/${e.slug}`} className="flex items-center gap-3.5 border-t border-edge/[0.06] px-4 py-3.5 first:border-0 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fill text-[13px] font-bold">{e.n}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{e.title}</span>
                  {e.blurb && <span className="line-clamp-2 text-[13px] text-muted">{e.blurb}</span>}
                  <span className="text-xs text-faint">{[fmt(e.date), e.area].filter(Boolean).join(" · ")}</span>
                </span>
                <Chevron />
              </Link>
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
