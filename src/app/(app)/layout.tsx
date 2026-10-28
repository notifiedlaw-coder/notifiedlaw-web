import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SessionUser } from "@/components/user";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionUser>
      <Suspense>
        <AppShell>{children}</AppShell>
      </Suspense>
    </SessionUser>
  );
}
