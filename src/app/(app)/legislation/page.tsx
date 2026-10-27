import { redirect } from "next/navigation";

// Legislation is browsed from the Case Law screen (Legislation tab).
export default function Page() {
  redirect("/case-law");
}
