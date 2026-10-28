import { Confirm } from "./confirm";

export const metadata = { title: "Confirm university email", robots: { index: false, follow: false } };

// Opening the link only shows this page; the email is confirmed by the button, so mail scanners that
// fetch links cannot verify an address on their own.
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <Confirm token={typeof token === "string" ? token : ""} />;
}
