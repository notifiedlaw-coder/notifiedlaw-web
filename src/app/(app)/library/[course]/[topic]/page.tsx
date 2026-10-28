import { notFound } from "next/navigation";
import { getPlan } from "@/lib/auth";
import { findIn, getCourses, getTopicBody } from "@/lib/cms";
import { topicLock } from "@/lib/data";
import { Reader } from "./reader";

// Topics come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: Promise<{ course: string; topic: string }> }) {
  const { course: slug, topic } = await params;
  const hit = findIn(await getCourses(), slug);
  const n = Number(topic);
  if (!hit || !Number.isInteger(n) || n < 1 || n > hit.course.topics.length) notFound();
  const info = hit.course.topics[n - 1];
  if (!info.ready) notFound();
  // A locked topic never sends its text: the plan is checked here, not in the browser.
  const lock = topicLock(await getPlan(), hit.level, n);
  const cms = lock ? { title: info.title, body: "" } : await getTopicBody(slug, n);
  if (!cms) notFound();
  return <Reader course={hit.course.title} slug={hit.course.slug} lock={lock} n={n} title={cms.title} body={cms.body} />;
}
