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
    "@type": "SoftwareApplication",
    name: SITE.name,
    url: SITE.url,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web, iOS, Android, macOS",
    description: SITE.description,
    audience: { "@type": "EducationalAudience", educationalRole: "student", audienceType: "Law students in Ghana" },
    image: abs(SITE.ogImage),
    offers: [
      { "@type": "Offer", name: "Attorney", price: "0", priceCurrency: "GHS" },
      { "@type": "Offer", name: "Senior Judicial (monthly)", price: "45", priceCurrency: "GHS" },
      { "@type": "Offer", name: "Supreme Justice (monthly)", price: "85", priceCurrency: "GHS" },
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
