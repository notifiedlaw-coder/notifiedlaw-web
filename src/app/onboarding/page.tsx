import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { profile } from "@/db/schema";
import { getDb, getSession } from "@/lib/auth";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Welcome", robots: { index: false, follow: false } };

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [done] = await getDb().select({ id: profile.userId }).from(profile).where(eq(profile.userId, session.user.id));
  if (done) redirect("/dashboard");
  // Prefill from the Google account; the user can correct it to match their ID.
  const [first = "", ...rest] = session.user.name.trim().split(/\s+/);
  return <Onboarding defaults={{ first, last: rest.pop() ?? "", middle: rest.join(" ") }} />;
}
