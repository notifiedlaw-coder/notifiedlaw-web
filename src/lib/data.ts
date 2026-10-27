export type Level = "100" | "200" | "300";
export type Plan = "Free" | "Pro" | "Pro Max";

export const PLAN_NAMES: Record<Plan, string> = {
  Free: "Attorney (Free)",
  Pro: "Senior Judicial (Pro)",
  "Pro Max": "Supreme Justice (Max)",
};

export type Course = {
  slug: string;
  title: string;
  code: string;
  color: string;
  progress: number;
  topics: string[];
};

const c = (
  title: string,
  code: string,
  color: string,
  progress: number,
  topics: string[],
): Course => ({
  slug: code.toLowerCase().replace(/\s+/g, "-"),
  title,
  code,
  color,
  progress,
  topics,
});

export const COURSES: Record<Level, Course[]> = {
  "100": [
    c("Legal Method", "LAW 101", "#007AFF", 0.48, ["Sources of Ghanaian Law", "Judicial Precedent & Stare Decisis", "Statutory Interpretation", "Legal Research & Citation", "Briefing a Case with IRAC"]),
    c("Ghana Legal System", "LAW 103", "#34C759", 0.3, ["Hierarchy of Courts under Article 126", "Customary Law as a Source of Law", "Chieftaincy & the National House of Chiefs", "The Legal Profession Act, 1960", "ADR Act, 2010 (Act 798)"]),
    c("Constitutional Law I", "LAW 105", "#FF9500", 0.2, ["Constitutional History, 1957–1992", "Sovereignty of the People (Art. 1)", "Separation of Powers", "The Executive", "Parliament & the Legislative Process"]),
    c("Law of Contract I", "LAW 107", "#AF52DE", 0.1, ["Offer & Acceptance", "Consideration & the Contracts Act, 1960", "Intention to Create Legal Relations", "Capacity to Contract", "Terms of a Contract"]),
  ],
  "200": [
    c("Constitutional Law II", "LAW 201", "#FF9500", 0.62, ["Judicial Review & the Supremacy of the Constitution", "Fundamental Human Rights (Chapter 5)", "Enforcement under Article 33", "Interpretation Jurisdiction (Art. 130)", "Emergency Powers"]),
    c("Law of Torts I", "LAW 203", "#30B0C7", 0.35, ["Negligence: Duty of Care", "Breach & Causation", "Trespass to the Person", "Defamation", "Vicarious Liability"]),
    c("Criminal Law I", "LAW 205", "#FF3B30", 0.4, ["Actus Reus & Mens Rea under Act 29", "General Defences", "Homicide", "Offences against Property", "Inchoate Offences"]),
    c("Law of Contract II", "LAW 207", "#AF52DE", 0.15, ["Misrepresentation", "Mistake", "Duress & Undue Influence", "Discharge of Contract", "Remedies for Breach"]),
  ],
  "300": [
    c("Land Law", "LAW 301", "#A2845E", 0, ["The Land Act, 2020 (Act 1036)", "Allodial & Usufructuary Titles", "Customary Land Tenure", "Registration of Title", "Leases & Licences"]),
    c("Equity & Trusts", "LAW 303", "#5856D6", 0, ["Maxims of Equity", "Express Trusts", "Resulting & Constructive Trusts", "Fiduciary Duties", "Equitable Remedies"]),
    c("Administrative Law", "LAW 305", "#34C759", 0, ["Rules of Natural Justice", "The Ultra Vires Doctrine", "Administrative Justice (Art. 23)", "CHRAJ & Ombudsman Functions", "Prerogative Writs"]),
    c("Law of Evidence", "LAW 307", "#007AFF", 0, ["The Evidence Act, 1975 (NRCD 323)", "Burden & Standard of Proof", "Hearsay", "Privilege", "Expert & Opinion Evidence"]),
  ],
};

export const LEVELS: Level[] = ["100", "200", "300"];

export function findCourse(slug: string) {
  for (const level of LEVELS) {
    const course = COURSES[level].find((x) => x.slug === slug);
    if (course) return { course, level };
  }
  return null;
}

export const abbr = (code: string) => code.replace("LAW ", "");

export const DEMO_USER = {
  name: "Ama Owusu",
  first: "Ama",
  uniShort: "UG Legon",
  level: "200" as Level,
  plan: "Free" as Plan,
};

export const QUOTE = {
  text: "The life of the law has not been logic; it has been experience.",
  by: "Oliver Wendell Holmes Jr.",
  role: "US Supreme Court Justice",
};

export const FLASHCARDS = [
  ["Which provision declares the 1992 Constitution the supreme law of Ghana?", "Article 1(2). Any law inconsistent with it is void to the extent of the inconsistency."],
  ["Who may bring an action under Article 2(1)?", "Any person. No personal interest beyond citizenship is required."],
  ["Which court has exclusive original jurisdiction to interpret and enforce the Constitution?", "The Supreme Court, under Article 130(1)."],
  ["What was decided in NPP v Attorney-General (the 31st December case)?", "Celebrating the coup anniversary with public funds was held inconsistent with the Constitution."],
  ["Where should a claim purely to enforce a fundamental right be brought?", "The High Court, under Article 33(1). See Edusei v Attorney-General."],
  ["What principle is Tuffuor v Attorney-General known for?", "The Constitution embodies the sovereign will of the people, and the courts must uphold its supremacy."],
] as const;
