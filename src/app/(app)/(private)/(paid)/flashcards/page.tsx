import { Page, Title } from "@/components/ui";
import { Flashcards } from "./flashcards";
import { MOCK_DECKS } from "./mock";

export const metadata = { title: "Flashcards" };

export default function Page_() {
  return (
    <Page max={960}>
      <Title title="Flashcards" sub="Review key points by course. Cards you miss come back until they stick." />
      <Flashcards decks={MOCK_DECKS} streak={5} />
    </Page>
  );
}
