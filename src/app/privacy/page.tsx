import type { Metadata } from "next";
import { LegalPage, CONTACT_EMAIL } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What NotifiedLaw collects, why, and the choices you have.",
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="28 October 2026"
      intro="This policy explains what personal information NotifiedLaw collects, how we use it and the choices you have. We handle your data in line with Ghana's Data Protection Act, 2012 (Act 843)."
      sections={[
        { h: "Information we collect", p: [[
          "Account details: your name, email address and profile picture, including when you sign in with Google or Apple.",
          "Study profile: your university, level, courses and preferences from onboarding.",
          "Activity: topics read, flashcards, exam answers, streaks, leaderboard standing and chats with Notified AI.",
          "Files you upload to My Files.",
          "Payment information: the plan you bought and a payment reference. Card and mobile money details are handled by our payment providers, not stored by us.",
          "Device and usage data: browser, device type, approximate location from IP address, and pages visited.",
        ]] },
        { h: "How we use it", p: [[
          "to run your account and deliver the service;",
          "to personalise notes, recommendations and AI answers;",
          "to process payments and prevent fraud and abuse;",
          "to fix problems and improve NotifiedLaw;",
          "to send service messages, and marketing only where you have agreed.",
        ]] },
        { h: "Sign in with Google", p: ["When you continue with Google we receive only your name, email address and profile picture. We use them to create and sign you in to your account. We do not access your Gmail, Drive, contacts or other Google data."] },
        { h: "Who we share it with", p: [
          "We do not sell your personal information. We share it only with service providers who help us run NotifiedLaw, such as hosting, payments, email and analytics, and only as needed for those tasks.",
          "We may disclose information if the law requires it or to protect our users and service.",
        ] },
        { h: "Notified AI", p: ["Questions you send to Notified AI may be processed by an AI provider to produce an answer. Please do not enter sensitive personal information in chats."] },
        { h: "Cookies and storage", p: ["We use cookies and browser storage to keep you signed in and remember settings such as your theme. We do not use them to track you across other websites."] },
        { h: "How long we keep it", p: ["We keep your information while your account is active and for a reasonable period afterwards where needed for legal, accounting or security reasons. You can ask us to delete your account and data.", "Messages between friends are kept for a short time only. A message is deleted 30 days after the person it was sent to opens it, or 90 days after it was sent if it is never opened. Removing a friend deletes your messages with them straight away."] },
        { h: "Your rights", p: ["Under Ghana's data protection law you can ask to see, correct or delete your personal information, object to certain uses, and withdraw consent. To do so, email us. You may also complain to the Data Protection Commission of Ghana."] },
        { h: "Security", p: ["We use encryption in transit and access controls to protect your data. No system is perfectly secure, so please use a strong, unique password."] },
        { h: "Children", p: ["NotifiedLaw is for students aged 16 and over. If you believe a child has given us information, contact us and we will delete it."] },
        { h: "Changes to this policy", p: ["We may update this policy and will change the date above. If a change is significant we will tell you in the app or by email."] },
        { h: "Contact", p: [`For privacy questions or requests, email ${CONTACT_EMAIL}, or write to NotifiedLaw, Accra, Ghana.`] },
      ]}
    />
  );
}
