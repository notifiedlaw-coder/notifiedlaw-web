import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import Link from "next/link";
import { OG_IMAGE, breadcrumbs } from "@/lib/seo";
import { SITE, abs } from "@/lib/site";
import { findIn, getCourses } from "@/lib/cms";
import { isMaxLevel, LEVEL_LABEL, SEMESTER_LABEL } from "@/lib/data";
import { myCompleted } from "@/lib/progress";
import { CourseTopics } from "./course-topics";

// Courses come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const hit = findIn(await getCourses(), (await params).course);
  if (!hit) return {};
  const { course, level } = hit;
  const title = `${course.title} notes · ${LEVEL_LABEL[level]}`;
  const description = `${course.title} notes for ${LEVEL_LABEL[level]} Ghanaian law students: ${course.topics.length} topics matched to faculty outlines.`;
  const url = `/library/${course.slug}`;
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: SITE.name, locale: SITE.locale, title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage] },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const [courses, completed] = await Promise.all([getCourses(), myCompleted()]);
  const hit = findIn(courses, slug);
  if (!hit) notFound();
  const { course, level } = hit;
  const ready = course.topics.filter((t) => t.ready).length;

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-4 px-[18px] pb-8 pt-3 md:px-8 md:pb-10 md:pt-4 lg:px-14 lg:pb-14 lg:pt-6">
      <JsonLd data={[
        {
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: `${course.title} notes for ${LEVEL_LABEL[level]} Ghanaian law students.`,
          url: abs(`/library/${course.slug}`),
          inLanguage: "en-GH",
          educationalLevel: LEVEL_LABEL[level],
          provider: { "@id": abs("/#org") },
          hasPart: course.topics.filter((t) => t.ready).map((t) => ({ "@type": "LearningResource", name: t.title })),
        },
        breadcrumbs([["Library", "/library"], [course.title, `/library/${course.slug}`]]),
      ]} />
      <Link href="/library" className="flex h-11 items-center self-start text-[16px] text-link" style={{ textDecoration: "none" }}>← Library</Link>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2.5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">{LEVEL_LABEL[level]} · {SEMESTER_LABEL(course.semester)}</div>
            <h1 className="m-0 text-[38px] leading-[1.02] md:text-[46px] lg:text-[56px]">{course.title}</h1>
            <div className="text-[15px] text-muted">{course.topics.length} topics · {ready} available</div>
          </div>
          <CourseTopics slug={course.slug} topics={course.topics} completed={completed} maxOnly={isMaxLevel(level)} />
        </div>
        <aside className="flex flex-col gap-3">
          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">Practise this course</div>
          <Link href="/flashcards" className="flex flex-col gap-1 rounded-2xl border border-edge/10 bg-surface p-[18px] hover:shadow-card-hover" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="text-[17px] font-semibold">Review flashcards</span><span className="text-[14px] text-faint">Key points, one card at a time</span>
          </Link>
          <Link href="/exam-prep" className="flex flex-col gap-1 rounded-2xl border border-edge/10 bg-surface p-[18px] hover:shadow-card-hover" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="text-[17px] font-semibold">Answer a past question</span><span className="text-[14px] text-faint">Marked by an expert</span>
          </Link>
          <Link href="/ai" className="flex flex-col gap-1 rounded-2xl border border-edge/10 bg-surface p-[18px] hover:shadow-card-hover" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="text-[17px] font-semibold">Ask Notified AI</span><span className="text-[14px] text-faint">Answers from Ghanaian law only</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
