import { JsonLd } from "@/components/json-ld";
import { FAQ, SITE, abs } from "@/lib/site";
import Landing from "./landing";
import { PLAN_PRICES } from "@/lib/content";

export const metadata = {
  title: { absolute: "NotifiedLaw — The Law at Your Fingertips" },
  alternates: { canonical: "/" },
};

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": abs("/#webpage"),
    url: SITE.url,
    name: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    inLanguage: "en-GH",
    isPartOf: { "@id": abs("/#website") },
    about: { "@type": "Thing", name: "Ghanaian law education" },
    primaryImageOfPage: abs(SITE.ogImage),
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    url: SITE.url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, iOS, Android, macOS",
    description: SITE.description,
    audience: { "@type": "EducationalAudience", educationalRole: "student", audienceType: "Law students in Ghana" },
    image: abs(SITE.ogImage),
    offers: [
      ...([["Student", PLAN_PRICES.Student], ["Senior Judicial", PLAN_PRICES.Pro], ["Supreme Justice", PLAN_PRICES["Pro Max"]]] as const).map(([name, price]) => (
        { "@type": "Offer", name: `${name} (monthly)`, price: String(price), priceCurrency: "GHS", url: abs("/#pricing"), availability: "https://schema.org/InStock" }
      )),
    ],
  },
];

export default function Root() {
  return (
    <>
      <JsonLd data={schema} />
      <Landing />
    </>
  );
}
