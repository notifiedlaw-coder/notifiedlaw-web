import { redirect } from "next/navigation";
import { getPlan } from "@/lib/auth";

// The app itself needs a plan (Student up, or a running university-email trial). Without one, people are sent to
// Plans; Settings, Plans and Checkout stay open, and the public library keeps its preview topics.
export default async function PaidLayout({ children }: { children: React.ReactNode }) {
  if ((await getPlan()) === "None") redirect("/plans");
  return children;
}
