import { notFound } from "next/navigation";
import { Statute } from "./statute";

export function generateStaticParams() {
  return [{ slug: "act-29" }];
}

export const metadata = {
  title: "Criminal Offences Act, 1960 (Act 29)",
  description: "Criminal Offences Act, 1960 (Act 29) of Ghana, section by section, with amendment status including the 2023 changes.",
  alternates: { canonical: "/legislation/act-29" },
};

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== "act-29") notFound();
  return <Statute />;
}
