import { notFound } from "next/navigation";
import { findCourse } from "@/lib/data";
import { Reader } from "./reader";

export default async function TopicPage({ params }: { params: Promise<{ course: string; topic: string }> }) {
  const { course: slug, topic } = await params;
  const hit = findCourse(slug);
  const n = Number(topic);
  if (!hit || !Number.isInteger(n) || n < 1 || n > hit.course.topics.length) notFound();
  return <Reader course={hit.course.title} code={hit.course.code} n={n} title={hit.course.topics[n - 1]} />;
}
