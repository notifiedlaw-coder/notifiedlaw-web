import { Empty, Page, Title } from "@/components/ui";

export const metadata = { title: "Notified AI" };

export default function Page_() {
  return (
    <Page max={760}>
      <Title title="Notified AI" sub="Ghanaian law only" />
      <Empty title="Notified AI is currently unavailable">Check back soon.</Empty>
    </Page>
  );
}
