import { notFound } from "next/navigation";
import { Statute } from "./statute";

export function generateStaticParams() {
  return [{ slug: "act-29" }];
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "act-29") notFound();
  return <Statute />;
}
