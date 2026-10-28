import { getCourses } from "@/lib/cms";
import { LibraryView } from "./library-view";

// Topics can come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ghana law course notes",
  description: "Course notes for every Ghanaian law course, from Level 100 to the Bar Course, matched to faculty outlines.",
  alternates: { canonical: "/library" },
};

export default async function Library() {
  return <LibraryView courses={await getCourses()} />;
}
