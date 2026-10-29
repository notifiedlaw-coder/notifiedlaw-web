import { Confirm } from "./confirm";

export const metadata = { title: "Confirm university email", robots: { index: false, follow: false } };

// Opening the emailed link only shows this page; signing in takes the button, so mail scanners that fetch
// links cannot use up the one-time token. A failed sign-in comes back here with ?error=.
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return <Confirm token={typeof token === "string" ? token : ""} failed={typeof error === "string"} />;
}
