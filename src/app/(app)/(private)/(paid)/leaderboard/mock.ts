import { hueOf } from "@/lib/friend-view";

// Sample standings and quiz for the Leaderboard mock-up, until weekly quizzes are scored for real.

export type Player = { id: string; name: string; school: string; week: number; all: number; move: number; streak: number; hue: number };

export const SCHOOL = "Lancaster University Ghana";

/** `move`: places gained (+) or lost (-) since last week. "me" is the signed-in student. */
export const PLAYERS: Player[] = [
  { id: "p1", name: "Akosua Mensah", school: "University of Ghana", week: 920, all: 6120, move: 0, streak: 21, hue: 340 },
  { id: "p2", name: "Kwame Owusu", school: "KNUST", week: 880, all: 5870, move: 2, streak: 14, hue: 210 },
  { id: "p3", name: "Efua Addo", school: SCHOOL, week: 845, all: 6410, move: -1, streak: 17, hue: 150 },
  { id: "p4", name: "Nana Yaw Boateng", school: "GIMPA", week: 790, all: 4980, move: 1, streak: 9, hue: 30 },
  { id: "p5", name: "Abena Osei", school: "University of Ghana", week: 765, all: 5240, move: 3, streak: 12, hue: 280 },
  { id: "p6", name: "Kofi Annan Darko", school: SCHOOL, week: 730, all: 4710, move: -2, streak: 6, hue: 190 },
  { id: "p7", name: "Esi Quaye", school: "UPSA", week: 705, all: 4390, move: 0, streak: 8, hue: 10 },
  { id: "p8", name: "Yaw Frimpong", school: "KNUST", week: 690, all: 5120, move: 4, streak: 11, hue: 240 },
  { id: "p9", name: "Adwoa Sarpong", school: SCHOOL, week: 660, all: 3980, move: -1, streak: 5, hue: 320 },
  { id: "p10", name: "Kojo Appiah", school: "University of Ghana", week: 640, all: 4560, move: 1, streak: 7, hue: 60 },
  { id: "p11", name: "Ama Serwaa", school: "GIMPA", week: 585, all: 3720, move: 2, streak: 4, hue: 170 },
  { id: "me", name: "You", school: SCHOOL, week: 410, all: 3260, move: 3, streak: 5, hue: 211 },
  { id: "p13", name: "Selorm Agbeko", school: "UPSA", week: 395, all: 3410, move: -3, streak: 3, hue: 120 },
  { id: "p14", name: "Fiifi Mensah", school: SCHOOL, week: 380, all: 3010, move: 0, streak: 2, hue: 300 },
  { id: "p15", name: "Dzifa Amegashie", school: "University of Ghana", week: 350, all: 3560, move: -1, streak: 6, hue: 40 },
  { id: "p16", name: "Kwabena Asante", school: "KNUST", week: 320, all: 2890, move: 1, streak: 3, hue: 260 },
  { id: "p17", name: "Naa Dedei Lamptey", school: SCHOOL, week: 295, all: 2640, move: -2, streak: 1, hue: 0 },
  { id: "p18", name: "Elikem Tetteh", school: "GIMPA", week: 240, all: 2310, move: 0, streak: 2, hue: 200 },
  { id: "p19", name: "Araba Ewusi", school: "UPSA", week: 195, all: 2150, move: -4, streak: 1, hue: 90 },
  { id: "p20", name: "Mawuli Dogbe", school: "KNUST", week: 120, all: 1780, move: -1, streak: 0, hue: 330 },
];

/** Sample points for a real friend, steady for each account, until quiz scores are saved. */
export function sampleScore(id: string): Pick<Player, "week" | "all" | "move" | "streak" | "hue"> {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const at = (n: number, mod: number) => Math.floor(h / n) % mod;
  return { week: 100 + at(1, 85) * 10, all: 1500 + at(7, 50) * 100, move: at(13, 9) - 4, streak: at(17, 22), hue: hueOf(id) };
}

export type QuizQuestion = { q: string; options: string[]; answer: number; why: string };

export const QUIZ: QuizQuestion[] = [
  { q: "Which article gives the Supreme Court exclusive original jurisdiction to interpret and enforce the 1992 Constitution?", options: ["Article 2", "Article 33", "Article 130", "Article 17"], answer: 2, why: "Article 130 gives the Supreme Court exclusive original jurisdiction in matters of interpretation and enforcement of the Constitution." },
  { q: "Which statute is the principal criminal code of Ghana?", options: ["Contracts Act, 1960 (Act 25)", "Courts Act, 1993 (Act 459)", "Criminal Offences Act, 1960 (Act 29)", "Evidence Act, 1975 (NRCD 323)"], answer: 2, why: "The Criminal Offences Act, 1960 (Act 29) sets out most offences and the general principles of criminal liability." },
  { q: "The neighbour principle in negligence comes from which case?", options: ["Carlill v Carbolic Smoke Ball Co", "Donoghue v Stevenson", "Adams v Lindsell", "Tuffuor v Attorney-General"], answer: 1, why: "Lord Atkin stated the neighbour principle in Donoghue v Stevenson." },
  { q: "Under the postal rule, acceptance by post is complete when the letter is:", options: ["Posted", "Received", "Read", "Answered"], answer: 0, why: "The postal rule makes acceptance complete on posting, even if the letter arrives late or never." },
  { q: "Who may bring an action under Article 2(1) of the Constitution?", options: ["Only people directly affected", "Only the Attorney-General", "Any person", "Only Members of Parliament"], answer: 2, why: "Article 2(1) lets any person bring an action, so personal injury need not be shown." },
];
