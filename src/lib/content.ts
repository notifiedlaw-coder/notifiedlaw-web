// Seed content lifted from the design handoff. Replaced by D1/R2 reads later.

export type Treatment =
  | "good" | "inforce" | "amended" | "repealed"
  | "followed" | "applied" | "considered" | "distinguished"
  | "checking" | "unchecked";

export const BADGES: Record<Treatment, { label: string; bg: string; fg: string }> = {
  good: { label: "Good law", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  inforce: { label: "In force", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  amended: { label: "Amended", bg: "rgba(255,149,0,0.14)", fg: "#C93400" },
  repealed: { label: "Repealed", bg: "rgba(255,59,48,0.12)", fg: "#D70015" },
  followed: { label: "Followed", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  applied: { label: "Applied", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  considered: { label: "Considered", bg: "rgba(0,122,255,0.1)", fg: "#0062CC" },
  distinguished: { label: "Distinguished", bg: "rgba(255,149,0,0.14)", fg: "#C93400" },
  checking: { label: "Open to check", bg: "rgba(0,122,255,0.1)", fg: "#0062CC" },
  unchecked: { label: "Not checked", bg: "rgba(118,118,128,0.12)", fg: "rgba(60,60,67,0.8)" },
};

/* ---------- Reader chapters (LAW 201, topic 1) ---------- */
export type Block =
  | { kind: "p"; pre: string; hl?: string; post?: string }
  | { kind: "case"; name: string; cite: string; body: string }
  | { kind: "md"; md: string }; // Markdown written in Notion
export type Q = { q: string; opts: string[]; a: number; why: string };
export type Chapter = { title: string; blocks: Block[]; quiz: Q[] };

export const CHAPTERS: Chapter[] = [
  {
    title: "The supremacy clause",
    blocks: [
      { kind: "p", pre: "The 1992 Constitution places itself above every other source of law in Ghana. Article 1(2) is the foundation: ", hl: "any law found to be inconsistent with any provision of the Constitution is void to the extent of the inconsistency.", post: " Judicial review is the mechanism by which the courts give that clause practical force." },
      { kind: "case", name: "Tuffuor v Attorney-General", cite: "[1980] GLR 637", body: "The court described the Constitution as the embodiment of the people’s sovereign will, and held that the judiciary must uphold it even against the other arms of government." },
    ],
    quiz: [
      { q: "Which provision declares the 1992 Constitution the supreme law of Ghana?", opts: ["Article 1(2)", "Article 2(1)", "Article 33(1)", "Article 130(1)"], a: 0, why: "Article 1(2) voids any law inconsistent with the Constitution, to the extent of the inconsistency." },
      { q: "Tuffuor v Attorney-General is best known for which idea?", opts: ["The Constitution embodies the people’s sovereign will", "Rights claims belong in the High Court", "Coup anniversaries can’t be publicly funded", "Parliament may amend any clause freely"], a: 0, why: "Tuffuor treats the Constitution as the people’s sovereign will, which the courts must uphold." },
    ],
  },
  {
    title: "Standing and jurisdiction",
    blocks: [
      { kind: "p", pre: "Under Article 2(1), ", hl: "any person", post: " who alleges that an enactment, or an act or omission of any person, is inconsistent with the Constitution may bring an action in the Supreme Court for a declaration. Standing is deliberately broad: the plaintiff need not show a personal interest beyond citizenship." },
      { kind: "p", pre: "Article 130(1) gives the Supreme Court exclusive original jurisdiction in matters relating to the enforcement or interpretation of the Constitution. Lower courts must refer genuine questions of interpretation upward rather than decide them." },
      { kind: "case", name: "NPP v Attorney-General", cite: "[1993–94] 2 GLR 35", body: "The “31st December case”. Public celebration of the coup anniversary with state funds was declared inconsistent with the spirit of the Constitution." },
    ],
    quiz: [
      { q: "Who may bring an action under Article 2(1)?", opts: ["Only the Attorney-General", "Any person", "Only someone personally affected", "Only a Member of Parliament"], a: 1, why: "Standing is broad: any person may sue, with no personal interest needed beyond citizenship." },
      { q: "A genuine question of constitutional interpretation arises in the High Court. What happens?", opts: ["The High Court decides it", "It is referred to the Supreme Court", "The case is struck out", "It goes to the Court of Appeal"], a: 1, why: "Article 130 gives the Supreme Court exclusive original jurisdiction, so the question is referred up." },
    ],
  },
  {
    title: "Article 2 or Article 33?",
    blocks: [
      { kind: "p", pre: "Where a claim is in substance about enforcing a fundamental human right, ", hl: "the proper forum is the High Court under Article 33(1)", post: ", not the Supreme Court. In Edusei v Attorney-General the Supreme Court declined jurisdiction on exactly this ground." },
      { kind: "p", pre: "In the exam, ask what the plaintiff really wants. A declaration that a law is unconstitutional points to Article 2. Relief for a breach of their own rights points to Article 33." },
    ],
    quiz: [
      { q: "Esi wants her own right to freedom of assembly enforced against a new Act. Where should she sue?", opts: ["Supreme Court, Article 2(1)", "High Court, Article 33(1)", "Court of Appeal", "CHRAJ only"], a: 1, why: "Enforcing one’s own fundamental right belongs in the High Court under Article 33(1)." },
      { q: "Why did the Supreme Court decline jurisdiction in Edusei v Attorney-General?", opts: ["The claim was really a rights-enforcement claim", "The plaintiff lacked citizenship", "The action was time-barred", "Parliament had already repealed the law"], a: 0, why: "In substance it was about enforcing rights, so the High Court was the proper forum." },
    ],
  },
];

export const PODCAST_CAPTIONS = [
  "“So Kwame, why does Article 1(2) matter so much?”",
  "“Because it means Parliament can’t just legislate around the Constitution.”",
  "“And Tuffuor is where the court really said that out loud.”",
  "“Here’s the exam trap: is it really an Article 2 case, or Article 33?”",
];

/* ---------- Case law ---------- */
export const CASE_LIST = [
  { title: "Abu Ramadan v Electoral Commission", cite: "[2015–16] 1 SCGLR 1", court: "Supreme Court", year: 2015, area: "Electoral law" },
  { title: "Amidu v Attorney-General, Waterville & Woyome", cite: "[2013–14] 1 SCGLR 606", court: "Supreme Court", year: 2013, area: "Public contracts · Art. 181" },
  { title: "Ransford France v Electoral Commission", cite: "[2012] 1 SCGLR 705", court: "Supreme Court", year: 2012, area: "Constitutional law" },
  { title: "Adjei-Ampofo v Accra Metropolitan Assembly", cite: "[2007–08] SCGLR 611", court: "Supreme Court", year: 2007, area: "Standing · Art. 2" },
  { title: "Edusei v Attorney-General", cite: "[1996–97] SCGLR 1", court: "Supreme Court", year: 1996, area: "Jurisdiction · Art. 33", slug: "edusei-v-attorney-general" },
  { title: "NPP v Attorney-General (31st December case)", cite: "[1993–94] 2 GLR 35", court: "Supreme Court", year: 1993, area: "Constitutional supremacy" },
  { title: "Tuffuor v Attorney-General", cite: "[1980] GLR 637", court: "Court of Appeal", year: 1980, area: "Constitutional supremacy" },
];

export const EDUSEI = {
  slug: "edusei-v-attorney-general",
  title: "Edusei v Attorney-General",
  cite: "[1996–97] SCGLR 1",
  court: "Supreme Court",
  year: 1996,
  citedBy: 3,
  areas: ["Jurisdiction", "Article 33", "Fundamental rights"],
  summary: "The Supreme Court held that it has no original jurisdiction to enforce an individual’s fundamental human rights. Under Articles 33(1) and 140(2) that jurisdiction belongs to the High Court. The Supreme Court’s original jurisdiction under Articles 2 and 130 covers interpreting and enforcing the Constitution generally, and reaches rights only where a genuine question of interpretation arises.",
  glance: [["Court", "Supreme Court of Ghana"], ["Outcome", "Dismissed for want of jurisdiction"], ["Proper forum", "High Court, Article 33(1)"]] as [string, string][],
  facts: "The plaintiff complained that his passport had been withheld and that this infringed his freedom of movement under Article 21. He went straight to the Supreme Court, invoking its original jurisdiction under Articles 2 and 130, and asked for declarations and orders enforcing his rights.",
  issues: ["Does the Supreme Court have original jurisdiction to enforce an individual’s fundamental human rights?", "How do Articles 2, 33 and 130 divide jurisdiction between the Supreme Court and the High Court?"],
  holding: "By a majority, the Supreme Court declined jurisdiction. A claim that is in substance about enforcing the plaintiff’s own fundamental rights must begin in the High Court under Article 33(1).",
  reasoning: ["Article 33(1) expressly gives the High Court power to enforce fundamental human rights.", "Article 140(2) confirms the High Court’s jurisdiction over rights enforcement.", "Article 130(1) makes the Supreme Court’s original jurisdiction exclusive, except for matters reserved to the High Court under Article 33.", "Citing Article 2 on the writ does not change the real character of the claim."],
  history: [["1996", "Writ issued in the Supreme Court under Articles 2 and 130"], ["1997", "Action dismissed for want of jurisdiction"], ["1998", "Review refused in Edusei v Attorney-General (No 2)"]] as [string, string][],
  principles: [
    { t: "The High Court, not the Supreme Court, has original jurisdiction to enforce an individual’s fundamental human rights.", n: 4 },
    { t: "The court looks at the substance of the claim and the relief sought, not the article cited on the writ.", n: 6 },
    { t: "The Supreme Court deals with rights only where a genuine question of constitutional interpretation arises.", n: 7 },
  ],
  paras: [
    "The plaintiff invokes the original jurisdiction of this court under Articles 2(1) and 130(1) of the Constitution. He complains that his passport has been withheld and that his freedom of movement under Article 21 has been infringed.",
    "He seeks declarations to that effect, together with orders for the return of the passport.",
    "The first question for the court is whether it has jurisdiction to entertain the action in the form in which it has been brought.",
    "The enforcement of the fundamental human rights of the individual is a matter for the High Court under Article 33(1), and this court will not assume that jurisdiction merely because Article 2 is cited on the writ.",
    "Article 140(2) confirms that the High Court has jurisdiction to enforce the fundamental human rights and freedoms guaranteed by the Constitution.",
    "In deciding which court is seised, we look at the substance of the claim and the relief sought, not at the label the plaintiff has placed on the writ.",
    "The original jurisdiction of this court under Article 130(1) remains available where a genuine question of interpretation arises, and rights may then be dealt with as an incident of that interpretation.",
    "No such question arises here. The action is, in substance, one for the enforcement of the plaintiff’s own rights, and it is dismissed for want of jurisdiction.",
  ],
  citing: [
    { title: "Edusei v Attorney-General (No 2)", cite: "[1998–99] SCGLR 753", court: "Supreme Court · 1998", kind: "followed" as Treatment, note: "Review refused; the jurisdiction point was affirmed." },
    { title: "Adjei-Ampofo v Accra Metropolitan Assembly", cite: "[2007–08] SCGLR 611", court: "Supreme Court · 2007", kind: "considered" as Treatment, note: "Separates Article 2 standing from personal rights enforcement." },
    { title: "Bimpong-Buta v General Legal Council", cite: "[2003–04] SCGLR 1200", court: "Supreme Court · 2003", kind: "distinguished" as Treatment, note: "A genuine interpretation question arose, so the court took jurisdiction." },
  ],
};

/* ---------- Legislation ---------- */
export const STATUTE_LIST = [
  { title: "Constitution of the Republic of Ghana, 1992", ref: "Constitution", group: "Constitution", year: 1992, kind: "inforce" as Treatment, note: "" },
  { title: "Land Act, 2020", ref: "Act 1036", group: "Acts of Parliament", year: 2020, kind: "inforce" as Treatment, note: "" },
  { title: "Alternative Dispute Resolution Act, 2010", ref: "Act 798", group: "Acts of Parliament", year: 2010, kind: "inforce" as Treatment, note: "" },
  { title: "Criminal Offences Act, 1960", ref: "Act 29", group: "Acts of Parliament", year: 1960, kind: "amended" as Treatment, note: "Amended 2023", slug: "act-29" },
  { title: "Contracts Act, 1960", ref: "Act 25", group: "Acts of Parliament", year: 1960, kind: "inforce" as Treatment, note: "" },
  { title: "Land Title Registration Act, 1986", ref: "PNDCL 152", group: "Decrees & PNDC Laws", year: 1986, kind: "repealed" as Treatment, note: "Repealed by Act 1036" },
  { title: "Evidence Act, 1975", ref: "NRCD 323", group: "Decrees & PNDC Laws", year: 1975, kind: "inforce" as Treatment, note: "" },
];

export const ACT29 = [
  { num: "11", title: "Provisions relating to intention", orig: "Where a person does an act for the purpose of causing, or with the knowledge that it will probably cause, a particular event, that person is presumed to have intended to cause that event, until it is shown that they believed the act would probably not cause it." },
  { num: "46", title: "Punishment for murder", orig: "A person who commits murder is liable to suffer death.", cur: "A person who commits murder is liable to imprisonment for life.", note: "Substituted by the Criminal Offences (Amendment) Act, 2023. The 1960 text provided for death." },
  { num: "47", title: "Murder", orig: "A person who intentionally causes the death of another person by unlawful harm commits murder, unless the murder is reduced to manslaughter by reason of an extreme provocation, or any other matter of partial excuse, as mentioned in section 52." },
];

/* ---------- Files, quiz, onboarding, billing ---------- */
export const FILES = [
  { name: "Lecture notes · Constitutional Law II", type: "folder", meta: "6 files · Updated 2 days ago" },
  { name: "Past papers", type: "folder", meta: "9 files · Updated 3 weeks ago" },
  { name: "LAW 201 Past Paper 2024.pdf", type: "pdf", meta: "1.2 MB · Yesterday" },
  { name: "Tutorial 3 – Article 2 problem question.docx", type: "docx", meta: "48 KB · 3 days ago" },
  { name: "My answer – Edusei problem question.docx", type: "docx", meta: "32 KB · Last week" },
  { name: "Lecture 4 slides – Judicial review.pdf", type: "pdf", meta: "4.8 MB · Last week" },
];

export const PRACTICE_QUIZ: Q[] = [
  { q: "Esi believes a new Act restricting public protests violates her own right to freedom of assembly, and wants that right enforced for herself. Where should she bring her action?", opts: ["The Supreme Court, under Article 2(1)", "The High Court, under Article 33(1)", "The Court of Appeal", "CHRAJ only"], a: 1, why: "A claim to enforce one’s own fundamental right belongs in the High Court under Article 33(1). The Supreme Court declined jurisdiction on this ground in Edusei v Attorney-General." },
  { q: "A genuine question about interpreting the Constitution arises in proceedings before the High Court. What should the judge do?", opts: ["Decide the question and proceed", "Stay proceedings and refer it to the Supreme Court", "Strike out the action", "Refer it to the Court of Appeal"], a: 1, why: "Article 130(2) requires the court to stay proceedings and refer the question to the Supreme Court, which has exclusive original jurisdiction under Article 130(1)." },
  { q: "Which case is best known for describing the Constitution as the embodiment of the people’s sovereign will?", opts: ["NPP v Attorney-General", "Edusei v Attorney-General", "Tuffuor v Attorney-General", "Ghana Bar Association v Attorney-General"], a: 2, why: "Tuffuor v Attorney-General [1980] GLR 637 is the classic Ghanaian statement of constitutional supremacy." },
];

export const LB_NAMES = ["Kwame Asante", "Efua Mensah", "Kofi Boateng", "Akosua Agyeman", "Yaw Darko", "Adwoa Frimpong", "Kwabena Ofori", "Esi Quaye", "Kojo Antwi", "Afia Amponsah", "Selorm Kpodo", "Naa Adjeley Tetteh", "Fiifi Annan", "Elikem Dzorgbo", "Abena Sarpong", "Kwesi Badu"];

export const UNIVERSITIES = [
  { name: "University of Ghana", city: "Legon, Accra" },
  { name: "KNUST", city: "Kumasi" },
  { name: "University of Cape Coast", city: "Cape Coast" },
  { name: "GIMPA", city: "Greenhill, Accra" },
  { name: "UPSA", city: "Accra" },
  { name: "Mountcrest University", city: "Accra" },
];

export const NETWORKS = [
  { label: "MTN MoMo", mark: "MTN", bg: "#FFCB05", fg: "#1D1D1F" },
  { label: "Telecel Cash", mark: "T", bg: "#E60000", fg: "#FFFFFF" },
  { label: "AT Money", mark: "AT", bg: "#0066B3", fg: "#FFFFFF" },
];

export const PRICES = {
  month: { pro: "GH₵45", max: "GH₵85", per: "/ month" },
  semester: { pro: "GH₵150", max: "GH₵290", per: "/ semester" },
};

/** Extra Notify Credits any plan can buy. They never expire. Placeholder prices. */
export const CREDIT_PACKS = [
  { id: "50", credits: 50, price: "GH₵15" },
  { id: "150", credits: 150, price: "GH₵40", tag: "BEST VALUE" },
  { id: "400", credits: 400, price: "GH₵95" },
];

export const AI_HISTORY = [
  { title: "Article 2 vs Article 33", mode: "Learn", when: "Today" },
  { title: "Feedback on my Edusei answer", mode: "Review", when: "Yesterday" },
  { title: "IRAC outline: negligence", mode: "Write", when: "Last week" },
];

/* ---------- Hot Topics Podcast ---------- */
export type PodRef = { kind: "Case" | "Statute" | "Topic" | "Article"; title: string; sub: string; href: string };
export type Episode = {
  n: number; title: string; date: string; mins: number; area: string; blurb: string;
  talking: string[]; refs: PodRef[];
};

export const PODCAST = {
  name: "Hot Topics",
  tagline: "What Accra is talking about, and the law behind it. Each episode links back to the cases, Acts and notes on NotifiedLaw.",
};

export const EPISODES: Episode[] = [
  {
    n: 4, title: "Passport withheld? Where do you actually sue?", date: "26 Oct 2026", mins: 17, area: "Fundamental rights",
    blurb: "A viral thread asks whether you can take the state straight to the Supreme Court over a withheld passport. We walk through Edusei and the Article 2 vs Article 33 split.",
    talking: ["Why the label on the writ does not decide the forum", "High Court under Article 33(1), step by step", "When a rights claim becomes a genuine interpretation question"],
    refs: [
      { kind: "Case", title: "Edusei v Attorney-General", sub: "[1996–97] SCGLR 1 · Case brief", href: "/case-law/edusei-v-attorney-general" },
      { kind: "Article", title: "Article 2 or Article 33? Choosing the right court", sub: "Constitutional law · 6 min read", href: "/articles/article-2-or-article-33" },
      { kind: "Topic", title: "Judicial Review & the Supremacy of the Constitution", sub: "Constitutional Law II · Topic 1", href: "/library/law-201/1" },
    ],
  },
  {
    n: 3, title: "Life, not death: what Act 29 says about murder now", date: "19 Oct 2026", mins: 21, area: "Criminal law",
    blurb: "The 2023 amendment replaced the death penalty with life imprisonment. We read section 46 side by side, original and current text.",
    talking: ["Section 46 before and after the amendment", "What stays the same in section 47", "How students should cite an amended provision"],
    refs: [
      { kind: "Statute", title: "Criminal Offences Act, 1960 (Act 29)", sub: "Amended 2023 · Original and current text", href: "/legislation/act-29" },
      { kind: "Article", title: "Murder after the 2023 amendment to Act 29", sub: "Criminal law · 5 min read", href: "/articles/murder-after-the-2023-amendment" },
    ],
  },
  {
    n: 2, title: "Who can challenge a law? Standing under Article 2", date: "12 Oct 2026", mins: 19, area: "Constitutional law",
    blurb: "Any person can sue, but not for every kind of relief. We use the 31st December case and Adjei-Ampofo to show how broad standing really is.",
    talking: ["“Any person” in Article 2(1)", "NPP v Attorney-General and state-funded celebrations", "Standing versus personal rights enforcement"],
    refs: [
      { kind: "Case", title: "NPP v Attorney-General (31st December case)", sub: "[1993–94] 2 GLR 35", href: "/case-law" },
      { kind: "Case", title: "Adjei-Ampofo v Accra Metropolitan Assembly", sub: "[2007–08] SCGLR 611", href: "/case-law" },
      { kind: "Article", title: "Standing under Article 2: how wide is “any person”?", sub: "Constitutional law · 7 min read", href: "/articles/standing-under-article-2" },
      { kind: "Topic", title: "Standing and jurisdiction", sub: "Chapter 2 of Topic 1", href: "/library/law-201/1" },
    ],
  },
  {
    n: 1, title: "Land in Accra: why the Land Act, 2020 matters", date: "5 Oct 2026", mins: 23, area: "Land law",
    blurb: "Double sales, unregistered titles and disputes in the capital. A first look at Act 1036 and what it repealed.",
    talking: ["What Act 1036 changed", "Why PNDCL 152 no longer applies", "Practical tips before buying land"],
    refs: [
      { kind: "Statute", title: "Land Act, 2020 (Act 1036)", sub: "In force", href: "/case-law" },
      { kind: "Statute", title: "Land Title Registration Act, 1986 (PNDCL 152)", sub: "Repealed by Act 1036", href: "/case-law" },
    ],
  },
];

/* ---------- Articles ---------- */
export type Article = {
  slug: string; title: string; date: string; mins: number; area: string; industry: string; views: number; summary: string;
  body: string[]; related: { label: string; href: string }[];
};

export const INDUSTRIES = ["Government & public sector", "Criminal justice", "Real estate"];

export const ARTICLES: Article[] = [
  {
    slug: "article-2-or-article-33",
    title: "Article 2 or Article 33? Choosing the right court",
    date: "26 Oct 2026", mins: 6, area: "Constitutional law", industry: "Government & public sector", views: 1840,
    summary: "A practical guide to deciding whether a constitutional claim belongs in the Supreme Court or the High Court.",
    body: [
      "Many students and litigants assume that any claim mentioning the Constitution belongs in the Supreme Court. It does not. The forum depends on what the plaintiff really wants.",
      "If the claim asks for a declaration that a law or act is inconsistent with the Constitution, Article 2(1) applies and the Supreme Court has exclusive original jurisdiction under Article 130(1).",
      "If the claim is in substance about enforcing the plaintiff’s own fundamental human rights, Article 33(1) sends it to the High Court. Edusei v Attorney-General confirms that citing Article 2 on the writ does not change this.",
      "A genuine question of interpretation can still arise inside a High Court case. In that event the court stays proceedings and refers the question up under Article 130(2).",
    ],
    related: [{ label: "Edusei v Attorney-General", href: "/case-law/edusei-v-attorney-general" }, { label: "Judicial Review topic", href: "/library/law-201/1" }],
  },
  {
    slug: "murder-after-the-2023-amendment",
    title: "Murder after the 2023 amendment to Act 29",
    date: "19 Oct 2026", mins: 5, area: "Criminal law", industry: "Criminal justice", views: 960,
    summary: "What changed in section 46 of the Criminal Offences Act and how to cite the amended text.",
    body: [
      "Section 46 of the Criminal Offences Act, 1960 (Act 29) originally provided that a person who commits murder is liable to suffer death.",
      "The Criminal Offences (Amendment) Act, 2023 substituted this with imprisonment for life. The definition of murder in section 47 is unchanged.",
      "When citing, give the section of Act 29 and note the amending Act, so a reader knows which version you rely on. Our statute page shows the original and current text side by side.",
    ],
    related: [{ label: "Criminal Offences Act, 1960 (Act 29)", href: "/legislation/act-29" }],
  },
  {
    slug: "standing-under-article-2",
    title: "Standing under Article 2: how wide is “any person”?",
    date: "12 Oct 2026", mins: 7, area: "Constitutional law", industry: "Government & public sector", views: 1210,
    summary: "Why Ghana’s Supreme Court lets citizens challenge laws without showing a personal stake.",
    body: [
      "Article 2(1) lets any person who alleges that an enactment or an act or omission is inconsistent with the Constitution bring an action for a declaration.",
      "The 31st December case, NPP v Attorney-General, shows the approach in practice: the plaintiff did not need a personal interest beyond citizenship.",
      "Standing is not the same as rights enforcement. A claim to vindicate one’s own rights is still an Article 33 matter for the High Court.",
    ],
    related: [{ label: "Case law", href: "/case-law" }, { label: "Judicial Review topic", href: "/library/law-201/1" }],
  },
  {
    slug: "buying-land-in-accra-after-act-1036",
    title: "Buying land in Accra after the Land Act, 2020",
    date: "5 Oct 2026", mins: 6, area: "Land law", industry: "Real estate", views: 2370,
    summary: "Why double sales keep happening and what Act 1036 expects of buyers and sellers.",
    body: [
      "Land disputes in the capital often start with a seller who has sold the same plot twice, or a buyer who never registered their interest.",
      "The Land Act, 2020 (Act 1036) consolidates the law and repealed the Land Title Registration Act, 1986 (PNDCL 152), so older guidance that relies on PNDCL 152 should be read with care.",
      "Before paying, search the title, confirm who holds the grant, and register promptly. This article is general information, not legal advice.",
    ],
    related: [{ label: "Legislation", href: "/case-law" }, { label: "Hot Topics Podcast", href: "/hot-topics" }],
  },
];
