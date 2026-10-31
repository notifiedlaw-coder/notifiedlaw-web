import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Eyebrow, Page } from "@/components/ui";
import { getEpisodes } from "@/lib/cms";

// Write-ups come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

const find = async (slug: string) => (await getEpisodes()).find((e) => e.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = await find((await params).slug);
  return e ? { title: e.title, description: e.blurb } : {};
}

export default async function Episode({ params }: { params: Promise<{ slug: string }> }) {
  const e = await find((await params).slug);
  if (!e) notFound();
  const when = e.date ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" }).format(e.date) : "";
  return (
    <Page max={720}>
      <Link href="/hot-topics" className="-mb-2 self-start text-[15px] font-semibold text-link no-underline">‹ Hot Topics</Link>
      <div>
        <Eyebrow color="#C4552B">Episode {e.n}{e.area ? ` · ${e.area}` : ""}</Eyebrow>
        <h1 className="text-balance m-0 mt-2 text-[38px] leading-[1.04] md:text-[48px]">{e.title}</h1>
        {when && <p className="m-0 mt-2 text-[15px] text-muted">{when}</p>}
      </div>
      <article style={{ fontFamily: "var(--font-serif)", fontSize: 19, lineHeight: 1.7 }}>
        <Markdown source={e.body} />
      </article>
    </Page>
  );
}
