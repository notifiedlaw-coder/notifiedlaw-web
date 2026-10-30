import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Eyebrow } from "@/components/ui";
import { OG_IMAGE, breadcrumbs } from "@/lib/seo";
import { SITE, abs } from "@/lib/site";
import { findIn, getCourses } from "@/lib/cms";
import { abbr, isMaxLevel, LEVEL_LABEL, SEMESTER_LABEL } from "@/lib/data";
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
    <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 pb-12 pt-6 md:px-10">
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
      <div className="relative h-40 overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${course.color}, ${course.color}66)` }}>
        <div className="absolute bottom-4 left-5 flex items-end gap-4 text-white">
          <div className="flex size-14 items-center justify-center rounded-2xl border-[3px] border-surface bg-white/20 text-xl font-bold">{abbr(course.title)}</div>
          <div>
            <div className="text-xs font-semibold opacity-80">{LEVEL_LABEL[level]} · {SEMESTER_LABEL(course.semester)}</div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">{course.title}</h1>
            <div className="text-[13px] opacity-80">{course.topics.length} topics · {ready} available</div>
          </div>
        </div>
      </div>
      <Eyebrow>Topics</Eyebrow>
      <CourseTopics slug={course.slug} topics={course.topics} completed={completed} maxOnly={isMaxLevel(level)} />
    </div>
  );
}
