import type { Metadata, Viewport } from "next";
import { CopyGuard } from "@/components/copy-guard";
import { JsonLd } from "@/components/json-ld";
import { SITE, abs } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: { telephone: false },
  keywords: [
    "Ghana law", "LLB Ghana", "law notes Ghana", "Ghana case law", "Ghana statutes",
    "Bar Course Ghana", "law exam prep", "Hot Topics podcast", "law flashcards", "Notified AI",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, width: 1800, height: 1200, alt: "NotifiedLaw on Mac, Home screen" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

const siteSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": abs("/#org"),
    name: SITE.name,
    url: SITE.url,
    logo: abs("/icon.svg"),
    description: SITE.description,
    address: { "@type": "PostalAddress", addressLocality: "Accra", addressCountry: "GH" },
    areaServed: { "@type": "Country", name: "Ghana" },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "notifiedlaw@gmail.com", availableLanguage: "English" },
    knowsAbout: ["Ghanaian law", "Ghana case law", "LLB exam preparation", "Bar Course Ghana"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": abs("/#website"),
    url: SITE.url,
    name: SITE.name,
    inLanguage: "en-GH",
    description: SITE.description,
    publisher: { "@id": abs("/#org") },
  },
];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GH" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("nl-theme");if(t!=="dark"&&t!=="system")t="light";document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <JsonLd data={siteSchema} />
        <CopyGuard />
        {children}
      </body>
    </html>
  );
}
