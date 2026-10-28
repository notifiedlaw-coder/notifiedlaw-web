import { notFound } from "next/navigation";
import { findIn, getCourses, getTopicBody } from "@/lib/cms";
import { isMaxLevel } from "@/lib/data";
import { Reader } from "./reader";

// Topics can come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function TopicPage({ params }: { params: Promise<{ course: string; topic: string }> }) {
  const { course: slug, topic } = await params;
  const hit = findIn(await getCourses(), slug);
  const n = Number(topic);
  if (!hit || !Number.isInteger(n) || n < 1 || n > hit.course.topics.length) notFound();
  const cms = await getTopicBody(slug, n);
  return <Reader course={hit.course.title} code={hit.course.code} slug={hit.course.slug} maxOnly={isMaxLevel(hit.level)} n={n} title={hit.course.topics[n - 1]} body={cms?.body} />;
}
