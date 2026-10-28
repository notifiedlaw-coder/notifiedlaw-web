import { Empty, Page, Title } from "@/components/ui";

export const metadata = { title: "Flashcards" };

export default function Page_() {
  return (
    <Page max={760}>
      <Title title="Flashcards" sub="Review key points by course" />
      <Empty title="No flashcards yet">Flashcards are generated as course content is uploaded.</Empty>
    </Page>
  );
}
