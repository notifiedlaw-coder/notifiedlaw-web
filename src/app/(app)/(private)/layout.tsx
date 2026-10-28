import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Everything in this group needs a signed-in user. The library, articles, case law and legislation
// stay public so they can be indexed.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect("/login");
  return children;
}
