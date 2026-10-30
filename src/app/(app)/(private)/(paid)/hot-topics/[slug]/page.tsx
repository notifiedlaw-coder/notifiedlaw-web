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
      <div>
        <Eyebrow color="#ff9f0a">Episode {e.n}{e.area ? ` · ${e.area}` : ""}</Eyebrow>
        <h1 className="text-balance mt-1.5 text-[30px] font-bold leading-tight tracking-[-0.02em] md:text-4xl">{e.title}</h1>
        {when && <p className="mt-2 text-sm text-muted">{when}</p>}
      </div>
      <article style={{ fontFamily: "var(--font-serif)", fontSize: 17, lineHeight: 1.65 }}>
        <Markdown source={e.body} />
      </article>
    </Page>
  );
}
