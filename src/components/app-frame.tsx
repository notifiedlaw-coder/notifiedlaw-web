import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SessionUser } from "@/components/user";

/** The signed-in app chrome: sidebar, top bar and plan context. */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <SessionUser>
      <Suspense>
        <AppShell>{children}</AppShell>
      </Suspense>
    </SessionUser>
  );
}
