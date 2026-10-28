import { Markdown } from "@/components/markdown";
import { Empty, Gate, Page, Title, cardCls } from "@/components/ui";
import { getPlan } from "@/lib/auth";
import { getQuestions } from "@/lib/cms";

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
  const questions = await getQuestions();
  return (
    <Page max={760}>
      <Title title="Exam Prep" sub="Mock questions" />
      {questions.length === 0 ? (
        <Empty title="No mock questions yet">Mock questions appear here once they are published.</Empty>
      ) : (
        questions.map((q, i) => (
          <details key={q.id} className={`${cardCls} group p-5`}>
            <summary className="flex cursor-pointer list-none flex-col gap-0.5">
              <span className="text-xs font-semibold text-muted">Question {i + 1}{q.course ? ` · ${q.course}` : ""}</span>
              <span className="text-[16px] font-semibold">{q.title}</span>
            </summary>
            <div className="mt-3 border-t border-edge/[0.06] pt-3"><Markdown source={q.body} /></div>
          </details>
        ))
      )}
    </Page>
  );
}
