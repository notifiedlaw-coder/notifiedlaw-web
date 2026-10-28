import { JsonLd } from "@/components/json-ld";
import { FAQ, SITE, abs } from "@/lib/site";
import Landing from "./landing";

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
      { "@type": "Offer", name: "Attorney", price: "0", priceCurrency: "GHS", url: abs("/#pricing"), availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: "Senior Judicial (monthly)", price: "45", priceCurrency: "GHS", url: abs("/#pricing"), availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: "Senior Judicial (per semester)", price: "150", priceCurrency: "GHS", url: abs("/#pricing"), availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: "Supreme Justice (monthly)", price: "85", priceCurrency: "GHS", url: abs("/#pricing"), availability: "https://schema.org/InStock" },
      { "@type": "Offer", name: "Supreme Justice (per semester)", price: "290", priceCurrency: "GHS", url: abs("/#pricing"), availability: "https://schema.org/InStock" },
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
