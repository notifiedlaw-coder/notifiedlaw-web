import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://notifiedlaw.com"),
  title: { default: "NotifiedLaw", template: "%s · NotifiedLaw" },
  description:
    "Notes, podcasts and exam prep for every law course, Level 100 to 300.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
