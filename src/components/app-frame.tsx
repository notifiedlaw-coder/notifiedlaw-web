import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { SessionUser } from "@/components/user";
import { getMe } from "@/lib/auth";

/** The signed-in app chrome: sidebar, top bar and plan context. Plan and profile are read here, on the server. */
export async function AppFrame({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <SessionUser>
      <Suspense>
        <AppShell me={me}>{children}</AppShell>
      </Suspense>
    </SessionUser>
  );
}
