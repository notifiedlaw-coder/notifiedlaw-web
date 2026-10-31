import Link from "next/link";
import { Chevron, Page, cardCls } from "@/components/ui";
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
      <header className="flex flex-col gap-2">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Hot Topics podcast</div>
        <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">The law behind the news.</h1>
        <p className="m-0 max-w-[600px] text-pretty text-[17px] leading-normal text-muted">Every episode links to the cases, Acts and notes it cites.</p>
      </header>
      <Podcast episodes={MOCK_EPISODES} />
      {episodes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="m-0 text-[30px]">Write-ups</h2>
          <div className={`${cardCls} overflow-hidden`}>
            {episodes.map((e) => (
              <Link key={e.slug} href={`/hot-topics/${e.slug}`} className="flex items-center gap-4 border-t border-edge/[0.07] px-5 py-4 first:border-0 hover:bg-hover" style={{ textDecoration: "none", color: "inherit" }}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-peach font-display text-[20px] text-[var(--peach-fg)]">{e.n}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[21px] leading-[1.15]">{e.title}</span>
                  {e.blurb && <span className="line-clamp-2 text-[15px] text-muted">{e.blurb}</span>}
                  <span className="text-[13px] text-faint">{[fmt(e.date), e.area].filter(Boolean).join(" · ")}</span>
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
