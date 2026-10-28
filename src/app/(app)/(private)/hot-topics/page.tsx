import Link from "next/link";
import { Chevron, Empty, Page, Title, cardCls } from "@/components/ui";
import { getEpisodes } from "@/lib/cms";

export const metadata = { title: "Hot Topics Podcast" };

// Write-ups come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" }).format(d) : "");

export default async function HotTopicsPage() {
  const episodes = await getEpisodes();
  return (
    <Page max={760}>
      <Title title="Hot Topics Podcast" sub="Write-ups for each Hot Topics episode" />
      {episodes.length === 0 ? (
        <Empty title="No write-ups yet">Hot Topics write-ups appear here once they are published.</Empty>
      ) : (
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
      )}
    </Page>
  );
}
