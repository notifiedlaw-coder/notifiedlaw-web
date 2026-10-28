import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Per-user pages: robots.txt stops crawling, this stops a linked URL from being indexed anyway.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Everything in this group needs a signed-in user. The library, articles, case law and legislation
// stay public so they can be indexed.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect("/login");
  return children;
}
