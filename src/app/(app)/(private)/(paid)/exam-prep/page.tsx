import { Gate, Page, Title, cardCls } from "@/components/ui";
import { getPlan } from "@/lib/auth";
import { ExamPrep } from "./exam-prep";

export const metadata = { title: "Exam Prep" };

// Questions come from Notion (D1), so this page is rendered on request.
export const dynamic = "force-dynamic";

export default async function Page_() {
  // Exam prep is a Supreme Justice feature: other plans never receive the questions, only the upgrade prompt.
  if ((await getPlan()) !== "Pro Max")
    return (
      <Page max={760}>
        <Title title="Exam Prep" sub="Mock questions" />
        <div className={`${cardCls} relative min-h-[320px] overflow-hidden`}>
          <Gate title="Exam Prep comes with Supreme Justice (Max)" body="Timed past questions with expert marking and written feedback." cta="Unlock with Supreme Justice (Max)" color="#AF52DE" />
        </div>
      </Page>
    );
  // A mock-up with sample content for now; published Notion questions (getQuestions) will feed it once marking exists.
  return <ExamPrep today={new Date().toISOString().slice(0, 10)} />;
}
