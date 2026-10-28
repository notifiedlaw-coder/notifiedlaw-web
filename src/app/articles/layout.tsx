import { AppFrame } from "@/components/app-frame";
import { PublicShell } from "@/components/public-shell";
import { getSession } from "@/lib/auth";

// Articles are public. Signed-in readers get them inside the app; everyone else gets the public site chrome.
export default async function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return (await getSession()) ? <AppFrame>{children}</AppFrame> : <PublicShell>{children}</PublicShell>;
}
