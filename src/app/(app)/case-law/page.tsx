import { getCaseBriefs } from "@/lib/cms";
import { CaseLaw } from "./case-law";

export const metadata = {
  title: "Ghana case law briefs",
  description: "Case briefs for Ghanaian law students: the facts, ratio and holding of leading judgments, searchable by court and course.",
  alternates: { canonical: "/case-law" },
};

// Case briefs come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function Page() {
  return <CaseLaw cases={await getCaseBriefs()} />;
}
