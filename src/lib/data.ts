export type Level = "100" | "200" | "300" | "400" | "pre-bar" | "bar";

/** Long label for headings, short label for tight segmented controls. */
export const LEVEL_LABEL: Record<Level, string> = {
  "100": "Level 100", "200": "Level 200", "300": "Level 300", "400": "Level 400",
  "pre-bar": "Pre-Bar", bar: "Bar Course",
};
export const LEVEL_SHORT: Record<Level, string> = {
  "100": "100", "200": "200", "300": "300", "400": "400", "pre-bar": "Pre-Bar", bar: "Bar Course",
};
export type Plan = "Free" | "Pro" | "Pro Max";

export const PLAN_NAMES: Record<Plan, string> = {
  Free: "Attorney (Free)",
  Pro: "Senior Judicial (Pro)",
  "Pro Max": "Supreme Justice (Max)",
};

/** Notify Credits: the AI allowance each plan includes per month. Placeholder amounts, to be set before launch. */
export const CREDIT_NAME = "Notify Credits";
export const PLAN_CREDITS: Record<Plan, number> = { Free: 0, Pro: 150, "Pro Max": 500 };
/** Credits one Notified AI message costs. */
export const AI_MESSAGE_COST = 1;

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
  // Level 400, Pre-Bar and Bar Course syllabi are placeholders: confirm with the faculty/Ghana School of Law.
  "400": [
    c("Jurisprudence", "LAW 401", "#5856D6", 0, ["Natural Law Theory", "Legal Positivism", "Realism & Sociological Jurisprudence", "Rights Theory", "Law & Morality"]),
    c("Company Law", "LAW 403", "#007AFF", 0, ["Corporate Personality & Registration", "Directors’ Duties (Companies Act, 2019)", "Shareholder Remedies", "Capital & Dividends", "Insolvency & Winding Up"]),
    c("Conflict of Laws", "LAW 405", "#30B0C7", 0, ["Jurisdiction & Foreign Judgments", "Choice of Law in Contract", "Choice of Law in Tort", "Family Matters across Borders", "Renvoi & Public Policy"]),
    c("Public International Law", "LAW 407", "#34C759", 0, ["Sources of International Law", "Statehood & Recognition", "Treaties", "State Responsibility", "Settlement of Disputes"]),
  ],
  "pre-bar": [
    c("Legal Skills & Research", "PBC 501", "#FF9500", 0, ["Legal Writing & Drafting", "Advanced Legal Research", "Client Interviewing", "Opinion Writing", "Negotiation"]),
    c("Civil Procedure Foundations", "PBC 503", "#007AFF", 0, ["Commencement of Actions", "Pleadings", "Interlocutory Applications", "Trial & Evidence in Practice", "Judgments & Execution"]),
    c("Criminal Procedure Foundations", "PBC 505", "#FF3B30", 0, ["Arrest, Bail & Charge", "Summary Trial", "Trial on Indictment", "Plea & Sentencing", "Appeals"]),
    c("Professional Ethics", "PBC 507", "#AF52DE", 0, ["Legal Profession Rules of Conduct", "Conflicts of Interest", "Client Account Rules", "Duties to the Court", "Discipline & the General Legal Council"]),
  ],
  bar: [
    c("Civil Litigation & Practice", "BAR 601", "#007AFF", 0, ["Preparing a Writ & Pleadings", "Interlocutory Practice", "Trial Advocacy", "Appeals Practice", "Enforcement of Judgments"]),
    c("Criminal Litigation & Practice", "BAR 603", "#FF3B30", 0, ["Advising at the Police Station", "Bail Applications", "Conducting a Trial", "Mitigation & Sentencing", "Criminal Appeals"]),
    c("Conveyancing & Drafting", "BAR 605", "#A2845E", 0, ["Land Searches & Due Diligence", "Drafting Leases & Deeds", "Registration of Title", "Commercial Agreements", "Wills & Probate"]),
    c("Legal Practice & Ethics", "BAR 607", "#AF52DE", 0, ["Setting Up a Practice", "Client Care & Fees", "Professional Conduct", "ADR in Practice", "Pro Bono & Legal Aid"]),
  ],
};

export const LEVELS: Level[] = ["100", "200", "300", "400", "pre-bar", "bar"];

export function findCourse(slug: string) {
  for (const level of LEVELS) {
    const course = COURSES[level].find((x) => x.slug === slug);
    if (course) return { course, level };
  }
  return null;
}

export const abbr = (code: string) => code.replace(/^[A-Z]+ /, "");

export const TOTAL_TOPICS = Object.values(COURSES).flat().reduce((n, c) => n + c.topics.length, 0);

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

/** [question, answer, course]. Decks for Level 400 and above are starter sets; confirm against the syllabus. */
export type Card = readonly [q: string, a: string, course: string];

export const FLASHCARDS: Record<Level, readonly Card[]> = {
  "100": [
    ["Which sources of law does Article 11(1) list for Ghana?", "The Constitution; enactments made by or under the authority of Parliament; orders, rules and regulations; existing law; and the common law.", "Legal Method"],
    ["What does stare decisis mean?", "Courts follow earlier decisions on the same point of law, according to the hierarchy of courts.", "Legal Method"],
    ["In whom does sovereignty reside under Article 1(1)?", "The people of Ghana, in whose name and for whose welfare the powers of government are exercised.", "Constitutional Law I"],
    ["Which Act provides for alternative dispute resolution in Ghana?", "The Alternative Dispute Resolution Act, 2010 (Act 798).", "Ghana Legal System"],
    ["What is the difference between an offer and an invitation to treat?", "An offer shows willingness to be bound once accepted. An invitation to treat only invites others to make offers, such as goods on display.", "Law of Contract I"],
    ["Which three arms of government does the separation of powers divide authority between?", "The legislature, the executive and the judiciary.", "Constitutional Law I"],
  ],
  "200": [
    ["Which provision declares the 1992 Constitution the supreme law of Ghana?", "Article 1(2). Any law inconsistent with it is void to the extent of the inconsistency.", "Constitutional Law II"],
    ["Who may bring an action under Article 2(1)?", "Any person. No personal interest beyond citizenship is required.", "Constitutional Law II"],
    ["Which court has exclusive original jurisdiction to interpret and enforce the Constitution?", "The Supreme Court, under Article 130(1).", "Constitutional Law II"],
    ["What was decided in NPP v Attorney-General (the 31st December case)?", "Celebrating the coup anniversary with public funds was held inconsistent with the Constitution.", "Constitutional Law II"],
    ["Where should a claim purely to enforce a fundamental right be brought?", "The High Court, under Article 33(1). See Edusei v Attorney-General.", "Constitutional Law II"],
    ["What principle is Tuffuor v Attorney-General known for?", "The Constitution embodies the sovereign will of the people, and the courts must uphold its supremacy.", "Constitutional Law II"],
    ["What are the elements of negligence?", "A duty of care, breach of that duty, and damage caused by the breach.", "Law of Torts I"],
    ["What are actus reus and mens rea?", "The guilty act and the guilty mind. Most crimes require both.", "Criminal Law I"],
  ],
  "300": [
    ["Which Act consolidated Ghana’s land law in 2020?", "The Land Act, 2020 (Act 1036).", "Land Law"],
    ["What are the two rules of natural justice?", "Audi alteram partem (hear the other side) and nemo judex in causa sua (no one should be a judge in their own cause).", "Administrative Law"],
    ["What does ultra vires mean?", "Beyond the powers. An act outside the authority given by law is invalid.", "Administrative Law"],
    ["Which Act governs the law of evidence in Ghana?", "The Evidence Act, 1975 (NRCD 323).", "Law of Evidence"],
    ["What does the maxim “equity will not suffer a wrong to be without a remedy” mean?", "Equity may give relief where the common law offers none.", "Equity & Trusts"],
    ["What is hearsay?", "An out-of-court statement offered to prove the truth of what it asserts, generally inadmissible unless an exception applies.", "Law of Evidence"],
  ],
  "400": [
    ["What is the core claim of legal positivism?", "Law is what is validly enacted or recognised, whatever its moral merit. Law and morality are conceptually separate.", "Jurisprudence"],
    ["Which Act governs companies in Ghana?", "The Companies Act, 2019 (Act 992).", "Company Law"],
    ["What does separate corporate personality mean?", "A company is a legal person distinct from its members, as in Salomon v Salomon.", "Company Law"],
    ["What does pacta sunt servanda mean?", "Agreements must be kept. Treaties in force bind the parties and must be performed in good faith.", "Public International Law"],
    ["What sources does Article 38(1) of the ICJ Statute list?", "Treaties, international custom, general principles of law, and judicial decisions and scholarly writings as subsidiary means.", "Public International Law"],
    ["What is renvoi?", "When the choice-of-law rule of the forum refers to a foreign law, whether to apply that law’s own conflict rules as well.", "Conflict of Laws"],
  ],
  "pre-bar": [
    ["Which Act regulates the legal profession in Ghana?", "The Legal Profession Act, 1960 (Act 32).", "Professional Ethics"],
    ["Which rules govern civil procedure in the High Court?", "The High Court (Civil Procedure) Rules, 2004 (C.I. 47).", "Civil Procedure Foundations"],
    ["Which Act governs criminal procedure?", "The Criminal and Other Offences (Procedure) Act, 1960 (Act 30).", "Criminal Procedure Foundations"],
    ["What is a conflict of interest for a lawyer?", "A situation where duties to one client, or the lawyer’s own interest, compromise duties to another client.", "Professional Ethics"],
    ["Why use IRAC when writing an opinion?", "It structures the answer: Issue, Rule, Application, Conclusion.", "Legal Skills & Research"],
  ],
  bar: [
    ["Which body oversees legal education and the professional conduct of lawyers?", "The General Legal Council.", "Legal Practice & Ethics"],
    ["Why run a land search before drafting a conveyance?", "To verify the seller’s title and discover any encumbrances before the client pays.", "Conveyancing & Drafting"],
    ["What should a bail application address?", "The charge, the risk of absconding or interference, the applicant’s ties and any proposed sureties.", "Criminal Litigation & Practice"],
    ["What is the first step in commencing a civil action in the High Court?", "Issuing a writ of summons with a statement of claim, as set out in C.I. 47.", "Civil Litigation & Practice"],
    ["What does ADR in practice offer a client?", "Faster, cheaper resolution through mediation or arbitration under Act 798, often preserving relationships.", "Legal Practice & Ethics"],
  ],
};
