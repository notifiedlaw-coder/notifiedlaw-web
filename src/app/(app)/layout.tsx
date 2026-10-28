import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { UserProvider, toAppUser } from "@/components/user";
import { getSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <UserProvider value={toAppUser(session.user)}>
      <Suspense>
        <AppShell>{children}</AppShell>
      </Suspense>
    </UserProvider>
  );
}
