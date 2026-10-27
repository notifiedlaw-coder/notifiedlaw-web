export const SITE = {
  name: "NotifiedLaw",
  url: "https://notifiedlaw.com",
  tagline: "The Law at Your Fingertips",
  description:
    "Notes, podcasts, flashcards and expertly marked exam prep for every Ghanaian law course, from Level 100 to the Bar Course.",
  locale: "en_GH",
  ogImage: "/landing/hero.jpg",
} as const;

export const abs = (path = "/") => new URL(path, SITE.url).toString();

/** Routes behind the app shell that hold per-user state. Kept out of search and AI indexes. */
export const PRIVATE_PATHS = [
  "/home", "/settings", "/files", "/ai", "/checkout", "/onboarding", "/flashcards",
  "/exam-prep", "/leaderboard", "/search", "/hot-topics", "/plans", "/login",
] as const;

export const FAQ = [
  {
    q: "What is NotifiedLaw?",
    a: "NotifiedLaw is a study platform for Ghanaian law students. It offers course notes, case law briefs, statutes, AI flashcards, a Hot Topics podcast and expertly marked exam practice for every law course from Level 100 to the Bar Course.",
  },
  {
    q: "Which courses and levels does NotifiedLaw cover?",
    a: "NotifiedLaw covers Levels 100 to 400, the Pre-Bar course and the Bar Course, with notes written to match Ghanaian law faculty outlines, such as Constitutional Law, Land Law and Criminal Law.",
  },
  {
    q: "How much does NotifiedLaw cost?",
    a: "The Attorney plan is free and includes the first 2 topics of every course. Senior Judicial costs GH₵45 per month or GH₵150 per semester. Supreme Justice costs GH₵85 per month or GH₵290 per semester.",
  },
  {
    q: "Can I pay with mobile money?",
    a: "Yes. NotifiedLaw accepts MTN MoMo, Telecel Cash and AT Money.",
  },
  {
    q: "What is Notified AI?",
    a: "Notified AI is a tutor that answers questions in plain English, grounded in NotifiedLaw course material, and cites the relevant cases and statutes.",
  },
  {
    q: "Is there a free trial for law students?",
    a: "Yes. Law students who sign up with a university email get a 7-day Supreme Justice trial.",
  },
  {
    q: "How does exam marking work?",
    a: "You answer timed past questions and receive expert marking with written feedback before your real examiner sees your work.",
  },
] as const;
