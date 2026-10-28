import { getCourses } from "@/lib/cms";
import { LibraryView } from "./library-view";

// Topics can come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export const metadata = { title: "Library" };

export default async function Library() {
  return <LibraryView courses={await getCourses()} />;
}
