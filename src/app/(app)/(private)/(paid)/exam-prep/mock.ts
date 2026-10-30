// Sample content for the Exam Prep mock-up, until mock exams are built from published questions and marked by Notified AI.

export type MockQuestion = {
  id: string; kind: "Problem question" | "Essay"; marks: number; text: string;
  /** What a strong answer covers; shown after marking. */
  outline: string[];
  strengths: string[]; improve: string[];
};
export type MockCourse = {
  code: string; course: string; color: string;
  /** Days from today to the exam. */
  examInDays: number; readiness: number;
  topics: { name: string; score: number }[];
  questions: MockQuestion[];
};
export type MockAttempt = { course: string; code: string; title: string; score: number; daysAgo: number; minutes: number };

export const COURSES: MockCourse[] = [
  {
    code: "CL2", course: "Constitutional Law II", color: "#0071E3", examInDays: 18, readiness: 0.72,
    topics: [{ name: "Judicial review", score: 0.84 }, { name: "Article 2 standing", score: 0.58 }, { name: "Human rights enforcement", score: 0.49 }, { name: "Separation of powers", score: 0.77 }],
    questions: [
      {
        id: "cl2-1", kind: "Problem question", marks: 25,
        text: "Kofi, a private citizen, believes a section of a new Act of Parliament conflicts with Article 17 of the 1992 Constitution (equality and freedom from discrimination). He has not been personally affected by the section. Advise Kofi on which court he should approach, whether he has standing, and the remedy he can expect.",
        outline: ["The Supreme Court's original jurisdiction to interpret and enforce the Constitution (Articles 2 and 130)", "Standing under Article 2(1): any person, no personal injury needed", "Remedy: a declaration, and the inconsistent provision is void to that extent (Article 1(2))", "Distinguish enforcement of human rights in the High Court under Article 33"],
        strengths: ["You identified the Supreme Court as the right forum.", "Clear statement of the Article 2(1) standing rule."],
        improve: ["Cite Article 130 alongside Article 2 when you give the jurisdiction.", "Explain why Article 33 is not the right route here."],
      },
      {
        id: "cl2-2", kind: "Essay", marks: 25,
        text: "\"A written constitution is only as strong as the courts that enforce it.\" Discuss, with reference to judicial review in Ghana.",
        outline: ["Supremacy of the Constitution (Article 1(2)) and the courts' power to enforce it", "Cases where courts struck down or read down laws and acts", "Limits: political questions, standing, judicial restraint", "A reasoned conclusion that engages with the quotation"],
        strengths: ["A clear thesis in your opening paragraph.", "Good use of Article 1(2)."],
        improve: ["Add at least two decided cases to support each point.", "Discuss the limits of judicial review, not only its strength."],
      },
      {
        id: "cl2-3", kind: "Problem question", marks: 25,
        text: "A magistrate dismisses a civil case after a hearing that the claimant says was not fair. The claimant wants to sue for breach of the right to a fair hearing. Which court hears this complaint, and on what basis?",
        outline: ["The right to a fair trial in Article 19", "Enforcement of fundamental human rights in the High Court (Article 33(1))", "The Supreme Court's exclusive jurisdiction applies to interpretation and enforcement of the Constitution, not to every rights claim", "Appeal routes as an alternative"],
        strengths: ["You separated rights enforcement from constitutional interpretation."],
        improve: ["Name the article that guarantees the right before discussing the remedy.", "Mention the appeal route as an alternative."],
      },
    ],
  },
  {
    code: "TRT", course: "Law of Torts", color: "#FF9500", examInDays: 25, readiness: 0.48,
    topics: [{ name: "Negligence: duty of care", score: 0.66 }, { name: "Remoteness", score: 0.41 }, { name: "Defences", score: 0.52 }, { name: "Nuisance", score: 0.38 }],
    questions: [
      {
        id: "trt-1", kind: "Problem question", marks: 25,
        text: "Ama buys a bottle of drink from a roadside kiosk and finds a foreign object in it after drinking some. She falls ill. The bottler had no contact with her. Advise Ama on a claim in negligence.",
        outline: ["Duty of care: the neighbour principle (Donoghue v Stevenson)", "Breach: the standard of the reasonable bottler, and how the object got in", "Causation and damage: illness caused by the product", "Remedies and any defence the bottler might raise"],
        strengths: ["You stated the neighbour principle accurately."],
        improve: ["Apply each element to the facts in turn: duty, breach, causation, damage.", "Say what Ama must prove about how the object got into the bottle."],
      },
      {
        id: "trt-2", kind: "Essay", marks: 25,
        text: "Critically assess the rule that a defendant is liable only for damage that was reasonably foreseeable.",
        outline: ["The test for remoteness of damage", "Foreseeability of the type of harm, not its extent", "The thin-skull rule as an exception in effect", "Whether the test is fair to claimants and defendants"],
        strengths: ["Good definition of remoteness."],
        improve: ["Distinguish the type of harm from its extent.", "Bring in the thin-skull rule and say how it fits."],
      },
    ],
  },
  {
    code: "CON", course: "Law of Contract", color: "#34C759", examInDays: 32, readiness: 0.81,
    topics: [{ name: "Offer and acceptance", score: 0.9 }, { name: "Consideration", score: 0.78 }, { name: "Privity", score: 0.69 }, { name: "Remedies", score: 0.85 }],
    questions: [
      {
        id: "con-1", kind: "Problem question", marks: 25,
        text: "Yaw emails Efua offering to sell his car for GH¢40,000 and says the offer stays open until Friday. On Wednesday Efua posts a letter accepting. On Thursday Yaw sells the car to someone else, and Efua's letter arrives on Friday. Is there a contract between Yaw and Efua?",
        outline: ["Offer and the power to revoke it before acceptance", "Acceptance by post: the postal rule, and when acceptance is complete", "Whether revocation has to be communicated to the offeree", "A reasoned conclusion on whether a contract exists"],
        strengths: ["Correct statement of the postal rule."],
        improve: ["Deal with revocation: it must reach the offeree before acceptance is complete."],
      },
      {
        id: "con-2", kind: "Essay", marks: 25,
        text: "To what extent does the Contracts Act, 1960 (Act 25) change the common law rule of privity of contract?",
        outline: ["The common law rule: only parties can sue or be sued", "The Act's provisions letting a third-party beneficiary enforce a promise", "Limits on the Act's reach", "Whether the change is enough"],
        strengths: ["Clear explanation of the common law rule."],
        improve: ["Refer to the specific provisions of Act 25 rather than the Act in general."],
      },
    ],
  },
];

export const ATTEMPTS: MockAttempt[] = [
  { course: "Constitutional Law II", code: "CL2", title: "Timed mock · 60 min", score: 0.68, daysAgo: 2, minutes: 58 },
  { course: "Law of Contract", code: "CON", title: "Quick practice", score: 0.74, daysAgo: 4, minutes: 19 },
  { course: "Law of Torts", code: "TRT", title: "Timed mock · 60 min", score: 0.51, daysAgo: 7, minutes: 60 },
];

/** Practice minutes in the last seven days, Monday first. */
export const WEEK_MINUTES = [35, 0, 62, 20, 48, 0, 25];
