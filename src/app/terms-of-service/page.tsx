import type { Metadata } from "next";
import { LegalPage, CONTACT_EMAIL } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use NotifiedLaw.",
  alternates: { canonical: "/terms-of-service" },
};

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="28 October 2026"
      intro="These terms govern your use of NotifiedLaw, a study platform for Ghanaian law students. By creating an account or using the service you agree to them. If you do not agree, please do not use NotifiedLaw."
      sections={[
        { h: "The service", p: ["NotifiedLaw provides course notes, case law briefs, statutes, flashcards, a podcast, an AI tutor (Notified AI) and exam practice. We may add, change or remove features at any time."] },
        { h: "Your account", p: [
          "You must give accurate information and keep your sign-in details secure. You are responsible for activity under your account.",
          "Accounts are for one person. Do not share your login or resell access.",
          "You must be at least 16 years old, or have a parent or guardian's permission, to use NotifiedLaw.",
        ] },
        { h: "Plans and payments", p: [
          "Student, Senior Judicial and Supreme Justice are paid plans billed monthly, at the prices shown on the pricing page at the time you buy. There is no free plan; some content is open to everyone as a preview.",
          "Payments are processed by third-party providers, including mobile money. Prices are in Ghana cedis (GH₵) and may change with notice for future purchases.",
          "Unless the law requires otherwise, payments are non-refundable once access has been provided. Contact us if you believe you were charged in error.",
        ] },
        { h: "Acceptable use", p: ["You agree not to:", [
          "copy, scrape, download in bulk, redistribute or resell our content;",
          "bypass access limits, copy protection or security features;",
          "use the service for anything unlawful, or to harass or harm others;",
          "interfere with the service or attempt to access other users' accounts.",
        ]] },
        { h: "Our content and your content", p: [
          "NotifiedLaw's notes, briefs, flashcards, audio, design and software are owned by us or our licensors and are licensed to you for personal, non-commercial study only. Court judgments and statutes remain subject to their own public status.",
          "Material you upload, such as files and notes, stays yours. You give us permission to store and process it to provide the service to you.",
        ] },
        { h: "Notified AI and academic use", p: [
          "NotifiedLaw is a study aid, not legal advice. Notified AI can make mistakes, so check important points against the original cases, statutes and your lecturers' guidance.",
          "Do not rely on NotifiedLaw for legal matters affecting real people. Follow your institution's rules on academic integrity.",
        ] },
        { h: "Suspension and ending", p: ["You can stop using NotifiedLaw and delete your account at any time. We may suspend or end access if you break these terms or misuse the service."] },
        { h: "Disclaimers and liability", p: [
          "The service is provided \"as is\". We work to keep content accurate and current but do not guarantee it is complete, error-free or always available.",
          "To the extent the law allows, NotifiedLaw is not liable for indirect or consequential losses, or for any loss beyond the amount you paid us in the 12 months before the claim.",
        ] },
        { h: "Changes to these terms", p: ["We may update these terms. If a change is significant we will tell you in the app or by email. Continuing to use NotifiedLaw after a change means you accept it."] },
        { h: "Governing law", p: ["These terms are governed by the laws of the Republic of Ghana, and the courts of Ghana have jurisdiction over any dispute."] },
        { h: "Contact", p: [`Write to us at ${CONTACT_EMAIL}, or by post to NotifiedLaw, Accra, Ghana.`] },
      ]}
    />
  );
}
