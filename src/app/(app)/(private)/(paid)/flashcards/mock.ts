// Sample decks for the Flashcards mock-up, until cards are generated from course content.

export type MockCard = { q: string; a: string; src: string };
export type MockDeck = { code: string; course: string; color: string; due: number; mastered: number; cards: MockCard[] };

export const MOCK_DECKS: MockDeck[] = [
  {
    code: "CL2", course: "Constitutional Law II", color: "#0071E3", due: 4, mastered: 0.62,
    cards: [
      { q: "Which court has exclusive original jurisdiction to interpret and enforce the 1992 Constitution?", a: "The Supreme Court, under Article 130(1).", src: "Topic 1 · Judicial Review" },
      { q: "Where do you bring an action to enforce a fundamental human right?", a: "The High Court, under Article 33(1). Labelling the writ as an Article 2 action does not take it to the Supreme Court.", src: "Edusei v Attorney-General · Case brief" },
      { q: "What is the effect of Article 1(2)?", a: "The Constitution is the supreme law, and any other law inconsistent with it is void to the extent of the inconsistency.", src: "Topic 1 · Judicial Review" },
      { q: "Who may bring an action under Article 2(1)?", a: "Any person who alleges that an enactment, or an act or omission of any person, is inconsistent with the Constitution.", src: "Topic 2 · Standing" },
      { q: "What did Tuffuor v Attorney-General decide about the Constitution?", a: "That it has a spirit and must be read as a living document; Apaloo CJ remained Chief Justice without fresh approval from Parliament.", src: "Tuffuor v Attorney-General · Case brief" },
    ],
  },
  {
    code: "TRT", course: "Law of Torts", color: "#FF9500", due: 3, mastered: 0.48,
    cards: [
      { q: "What must a claimant prove in negligence?", a: "A duty of care, breach of that duty, and damage caused by the breach that is not too remote.", src: "Topic 4 · Negligence" },
      { q: "What principle comes from Donoghue v Stevenson?", a: "The neighbour principle: take reasonable care to avoid acts or omissions you can reasonably foresee would injure your neighbour.", src: "Donoghue v Stevenson · Case brief" },
      { q: "What is volenti non fit injuria?", a: "A complete defence where the claimant freely and knowingly accepted the risk of harm.", src: "Topic 7 · Defences" },
      { q: "When does res ipsa loquitur apply?", a: "When the thing causing harm was under the defendant's control and the accident would not ordinarily happen without negligence.", src: "Topic 5 · Proof of negligence" },
    ],
  },
  {
    code: "CRM", course: "Criminal Law I", color: "#FF3B30", due: 2, mastered: 0.3,
    cards: [
      { q: "What is the principal criminal code of Ghana?", a: "The Criminal Offences Act, 1960 (Act 29).", src: "Topic 1 · Sources of criminal law" },
      { q: "Define actus reus.", a: "The physical element of an offence: the conduct, circumstances and, for result crimes, the consequence.", src: "Topic 2 · Elements of an offence" },
      { q: "Define mens rea.", a: "The mental element of an offence, such as intention, knowledge or negligence.", src: "Topic 2 · Elements of an offence" },
    ],
  },
  {
    code: "CON", course: "Law of Contract", color: "#34C759", due: 0, mastered: 0.81,
    cards: [
      { q: "What are the elements of a valid contract?", a: "Offer, acceptance, consideration, and an intention to create legal relations.", src: "Topic 1 · Formation" },
      { q: "Must consideration be adequate?", a: "No. It must be sufficient, meaning of some value in law, but need not match the value of the promise.", src: "Topic 3 · Consideration" },
      { q: "What is the postal rule?", a: "Acceptance by post is complete when the letter is posted, not when it arrives.", src: "Adams v Lindsell · Case brief" },
      { q: "How does the Contracts Act, 1960 (Act 25) change privity?", a: "Part II lets a third party enforce a promise made for their benefit.", src: "Topic 6 · Privity" },
    ],
  },
];
