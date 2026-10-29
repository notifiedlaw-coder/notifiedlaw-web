// Sample episodes for the Hot Topics mock-up, until audio and episode data are published from Notion.

export type RefKind = "Case" | "Act" | "Article" | "Topic";
export type MockRef = { kind: RefKind; title: string; sub: string; href: string };
export type MockEpisode = { n: number; title: string; blurb: string; area: string; date: string; secs: number; chapters: [number, string][]; refs: MockRef[] };

export const MOCK_EPISODES: MockEpisode[] = [
  {
    n: 12, area: "Land law", date: "28 Oct 2026", secs: 1260,
    title: "Landguards in Kasoa: can you hire muscle to protect your plot?",
    blurb: "Videos of armed landguards clearing a site near Kasoa went round WhatsApp this week. We look at who actually owns customary land, what the Land Act says about self-help, and when guarding a plot becomes a crime.",
    chapters: [[0, "What happened in Kasoa"], [150, "Customary freehold and the stool's allodial title"], [480, "Self-help under the Land Act, 2020"], [780, "Landguards and the Vigilantism Act"], [1050, "What a buyer should do instead"]],
    refs: [
      { kind: "Act", title: "Land Act, 2020 (Act 1036)", sub: "Sections 1–20 · Interests in land", href: "/library" },
      { kind: "Case", title: "Awuku v Tetteh", sub: "[2011] 1 SCGLR 366 · Case brief", href: "/case-law" },
      { kind: "Act", title: "Vigilantism and Related Offences Act, 2019 (Act 999)", sub: "Section 2 · Offences", href: "/library" },
      { kind: "Topic", title: "Customary Land Tenure", sub: "Land Law I · Topic 3", href: "/library" },
    ],
  },
  {
    n: 11, area: "Banking & cyber law", date: "21 Oct 2026", secs: 1080,
    title: "MoMo fraud: who pays when the money is gone?",
    blurb: "A spike in SIM-swap scams across Accra has left customers fighting their networks and banks for refunds. Who bears the loss, and what duties does the law put on the provider?",
    chapters: [[0, "How SIM-swap fraud works"], [210, "Duty of care owed by a payment provider"], [540, "The Payment Systems and Services Act"], [810, "Where to complain, and in what order"]],
    refs: [
      { kind: "Act", title: "Payment Systems and Services Act, 2019 (Act 987)", sub: "Consumer protection provisions", href: "/library" },
      { kind: "Act", title: "Cybersecurity Act, 2020 (Act 1038)", sub: "Part on cybercrime", href: "/library" },
      { kind: "Article", title: "Negligence and the banker–customer relationship", sub: "Torts · 7 min read", href: "/articles" },
      { kind: "Topic", title: "Duty of Care", sub: "Law of Torts · Topic 4", href: "/library" },
    ],
  },
  {
    n: 10, area: "Constitutional law", date: "14 Oct 2026", secs: 1140,
    title: "Marching to Jubilee House: do you need police permission?",
    blurb: "Organisers of this month's demonstration were told to call it off. We explain notice versus permission under the Public Order Act, and how the courts have read the right to assemble.",
    chapters: [[0, "The demonstration that was called off"], [180, "Article 21 and the freedom of assembly"], [420, "NPP v IGP: notice, not permission"], [750, "What the Public Order Act still lets the police do"]],
    refs: [
      { kind: "Case", title: "New Patriotic Party v Inspector-General of Police", sub: "[1993–94] 2 GLR 459 · Case brief", href: "/case-law" },
      { kind: "Act", title: "Public Order Act, 1994 (Act 491)", sub: "Sections 1–2 · Notice of special events", href: "/library" },
      { kind: "Topic", title: "Fundamental Human Rights", sub: "Constitutional Law II · Topic 5", href: "/library" },
    ],
  },
  {
    n: 9, area: "Fundamental rights", date: "7 Oct 2026", secs: 1020,
    title: "Passport withheld? Where do you actually sue?",
    blurb: "A viral thread asks whether you can take the state straight to the Supreme Court over a withheld passport. We walk through Edusei and the Article 2 vs Article 33 split.",
    chapters: [[0, "The viral thread"], [160, "Why the label on the writ does not decide the forum"], [450, "High Court under Article 33(1), step by step"], [760, "When a rights claim becomes a genuine interpretation question"]],
    refs: [
      { kind: "Case", title: "Edusei v Attorney-General", sub: "[1996–97] SCGLR 1 · Case brief", href: "/case-law" },
      { kind: "Article", title: "Article 2 or Article 33? Choosing the right court", sub: "Constitutional law · 6 min read", href: "/articles" },
      { kind: "Topic", title: "Judicial Review & the Supremacy of the Constitution", sub: "Constitutional Law II · Topic 1", href: "/library" },
    ],
  },
  {
    n: 8, area: "Labour law", date: "30 Sep 2026", secs: 960,
    title: "Nurses on strike: when is industrial action lawful?",
    blurb: "With wards at Korle Bu short-staffed, we ask when a strike is protected, what counts as an essential service, and what the National Labour Commission can order.",
    chapters: [[0, "The strike so far"], [140, "The Labour Act's route to a lawful strike"], [400, "Essential services and compulsory arbitration"], [700, "Can the employer withhold pay?"]],
    refs: [
      { kind: "Act", title: "Labour Act, 2003 (Act 651)", sub: "Sections 159–171 · Strikes and lockouts", href: "/library" },
      { kind: "Article", title: "The National Labour Commission's powers, explained", sub: "Employment law · 5 min read", href: "/articles" },
    ],
  },
];
