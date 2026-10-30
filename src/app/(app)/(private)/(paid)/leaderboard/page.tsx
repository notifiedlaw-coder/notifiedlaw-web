import { Gate, Page, Title, cardCls } from "@/components/ui";
import { getPlan } from "@/lib/auth";
import { Leaderboard } from "./leaderboard";

export const metadata = { title: "Leaderboard" };

// Dates are read on request.
export const dynamic = "force-dynamic";

export default async function Page_() {
  // The Leaderboard is a Senior Judicial (Pro) and Supreme Justice feature: other plans only see the upgrade prompt.
  const plan = await getPlan();
  if (plan !== "Pro" && plan !== "Pro Max")
    return (
      <Page max={760}>
        <Title title="Leaderboard" sub="Weekly quiz" />
        <div className={`${cardCls} relative min-h-[320px] overflow-hidden`}>
          <Gate title="The Leaderboard comes with Senior Judicial (Pro)" body="Take the weekly quiz and climb the rankings against students across Ghana." cta="Unlock with Senior Judicial (Pro)" color="#5E5CE6" />
        </div>
      </Page>
    );
  // A mock-up with sample standings for now; real scores will come from the weekly quiz.
  return <Leaderboard today={new Date().toISOString().slice(0, 10)} />;
}
