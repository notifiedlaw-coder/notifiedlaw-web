import { getCaseBriefs } from "@/lib/cms";
import { CaseLaw } from "./case-law";

export const metadata = { title: "Case Law" };

// Case briefs can come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function Page() {
  return <CaseLaw extra={await getCaseBriefs()} />;
}
