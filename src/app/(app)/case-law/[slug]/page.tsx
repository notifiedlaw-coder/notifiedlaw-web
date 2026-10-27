import { notFound } from "next/navigation";
import { EDUSEI } from "@/lib/content";
import { CaseBrief } from "./case-brief";

export function generateStaticParams() {
  return [{ slug: EDUSEI.slug }];
}

export const metadata = {
  title: `${EDUSEI.title} case brief`,
  description: `Case brief for ${EDUSEI.title} ${EDUSEI.cite}: facts, issues, holding and ratio, with later treatment.`,
  alternates: { canonical: `/case-law/${EDUSEI.slug}` },
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== EDUSEI.slug) notFound();
  return <CaseBrief />;
}
