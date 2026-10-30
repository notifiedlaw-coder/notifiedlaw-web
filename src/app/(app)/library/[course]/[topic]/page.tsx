import { notFound } from "next/navigation";
import { getPlan } from "@/lib/auth";
import { findIn, getCourses, getTopicBody } from "@/lib/cms";
import { topicLock } from "@/lib/data";
import { OG_IMAGE, excerpt } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { Reader } from "./reader";

// Topics come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

type Params = Promise<{ course: string; topic: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { course: slug, topic } = await params;
  const hit = findIn(await getCourses(), slug);
  const n = Number(topic);
  const info = hit?.course.topics[n - 1];
  if (!hit || !info?.ready) return {};
  // Only open preview topics are indexed; locked text is never in the page, so it would be a thin duplicate.
  const open = topicLock("None", hit.level, n) === null;
  const title = `${info.title} · ${hit.course.title} notes`;
  const description = open
    ? excerpt((await getTopicBody(slug, n))?.body ?? "") || `${info.title}: ${hit.course.title} notes for Ghanaian law students.`
    : `${info.title}: ${hit.course.title} notes for Ghanaian law students.`;
  const url = `/library/${slug}/${n}`;
  return {
    title, description, alternates: { canonical: url },
    ...(open ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: "article", url, siteName: SITE.name, locale: SITE.locale, title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage] },
  };
}

export default async function TopicPage({ params }: { params: Params }) {
  const { course: slug, topic } = await params;
  const hit = findIn(await getCourses(), slug);
  const n = Number(topic);
  if (!hit || !Number.isInteger(n) || n < 1 || n > hit.course.topics.length) notFound();
  const info = hit.course.topics[n - 1];
  if (!info.ready) notFound();
  // A locked topic never sends its text: the plan is checked here, not in the browser.
  const lock = topicLock(await getPlan(), hit.level, n);
  const cms = lock ? { id: null, title: info.title, body: "" } : await getTopicBody(slug, n);
  if (!cms) notFound();
  return <Reader course={hit.course.title} slug={hit.course.slug} lock={lock} n={n} title={cms.title} body={cms.body} topicId={cms.id} />;
}
