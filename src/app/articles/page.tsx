import { getArticles } from "@/lib/cms";
import { Articles } from "./articles";

export const metadata = { title: "Articles" };

// Articles come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function Page() {
  const list = (await getArticles()).map((a) => ({ slug: a.slug, title: a.title, summary: a.summary, industry: a.industry, mins: a.mins, date: a.date?.toISOString() ?? null }));
  return <Articles list={list} />;
}
