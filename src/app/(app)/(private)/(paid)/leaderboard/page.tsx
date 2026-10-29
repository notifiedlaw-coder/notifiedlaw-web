import { Empty, Page, Title } from "@/components/ui";

export const metadata = { title: "Leaderboard" };

export default function Page_() {
  return (
    <Page max={760}>
      <Title title="Leaderboard" sub="Weekly quiz" />
      <Empty title="The leaderboard is currently unavailable">Check back soon.</Empty>
    </Page>
  );
}
