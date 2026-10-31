// Blocks swearing and slurs in messages and group names. Text is normalised first (accents, look-alike letters from
// other scripts, leetspeak), then matched against stems with word edges, so words that merely contain one ("class",
// "assess", "Scunthorpe", "cocktail", "Pakistan", "between") pass. Each letter may repeat ("fuuuck"), inner letters may
// be masked ("f*ck", "s#it"), and longer stems may be spelt out ("f.u.c.k", "f u c k").
// Legal vocabulary a law student needs is deliberately left out: rape, sodomy, buggery, bastardy, prostitution,
// pornography, penis, vagina, "cum" (as in cum testamento annexo), Dick (a name), cock (a bird), prick (a verb).

/** Look-alike letters from other scripts, folded to Latin. */
const SCRIPT: Record<string, string> = {
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", к: "k", м: "m", т: "t", в: "b", н: "h",
  α: "a", ε: "e", ο: "o", ρ: "p", ι: "i", κ: "k", ν: "v", τ: "t", υ: "u", χ: "x",
};
/** Leetspeak, folded only inside or next to a word so "page 45" and "wow!" stay as they are. */
const LEET: Record<string, string> = { "@": "a", "4": "a", "8": "b", "3": "e", "6": "g", "9": "g", "1": "i", "!": "i", "|": "i", "0": "o", "5": "s", "$": "s", "7": "t", "€": "e" };
/** These are punctuation at a word's end, so they fold only between letters ("sh!t", not "shit!"). */
const INNER_ONLY = new Set(["!", "|", "1"]);

/** Lowercases, strips accents and zero-width characters, and folds look-alike letters and leetspeak. */
export function normalise(text: string) {
  const t = text.normalize("NFKD").replace(/[̀-ͯ​-‍⁠﻿]/g, "").toLowerCase().replace(/./g, (c) => SCRIPT[c] ?? c);
  const wordy = (c: string | undefined) => !!c && (/[a-z]/.test(c) || c in LEET);
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    const map = LEET[c];
    const before = wordy(t[i - 1]), after = wordy(t[i + 1]);
    out += map && (INNER_ONLY.has(c) ? before && after : before || after) ? map : c;
  }
  return out;
}

// Stems as they are spelt; a doubled letter means "at least two" ("nigger" does not match "Niger").
const LONG = [
  // English swearing
  "fuck", "fuk", "fck", "fuq", "phuck", "fvck", "fukk", "motherfuck", "muthafuck", "mothafuck", "mofo", "shit", "shite", "bullshit", "horseshit",
  "dipshit", "bitch", "biatch", "beatch", "cunt", "kunt", "twat", "wanker", "wank", "bollock", "bollox", "dickhead", "cocksucker", "pussy", "pussies",
  "slut", "whore", "skank", "jizz", "dildo", "blowjob", "handjob", "rimjob", "titties", "tittie", "boobs", "boobies", "porn", "porno", "pornhub",
  "xvideos", "xhamster", "milf", "asshole", "arsehole", "arse", "jackass", "dumbass", "smartass", "badass", "fatass", "asshat", "asswipe",
  "dumbfuck", "dumbshit", "goddamn", "goddam", "damnit", "dammit", "bellend", "knobhead", "douche", "douchebag", "screwyou", "stfu", "gtfo",
  "wtf", "omfg", "fml", "piss", "pissed", "pissoff", "shithead", "shitface", "bastards", "sonofabitch", "sob", "hoe", "thot",
  // Slurs
  "nigger", "nigga", "niggah", "niggaz", "nigg", "kike", "spic", "wetback", "paki", "raghead", "towelhead", "gook", "faggot", "fagot", "fag",
  "dyke", "tranny", "shemale", "retard", "retarded", "spaz", "spastic", "sandnigger", "porchmonkey", "junglebunny", "beaner",
  // Ghanaian Twi and Pidgin
  "kwasia", "kwasea", "kwasiaba", "gyimi", "gyimii", "aboa", "wo maame twe", "wo maame tw3", "wo ni twe", "wo twe", "etwe", "wo kote",
  "ashawo", "asawo", "shua", "mumu", "olodo", "oloshi", "werey", "sheege",
];
// Short stems: whole words only, spelt exactly (no repeated or masked letters), so "assess" and "glasses" pass.
const SHORT = ["ass", "tits", "crap", "crappy", "damn", "damned", "turd", "twe", "hoes", "cunts", "fucks"];

const SEP = "[\\s._\\-~'\"`,]{0,2}";
const MASK = "[*#%]";
const ENDINGS = "(?:s|es|z|ed|d|er|ers|ing|in|ings|y|ie|ies|a|ah|as|az|ish|head|heads|face|hole|wad|bag|off|up)?";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A stem as a pattern: each run of a letter repeats, inner letters may be masked, and long stems may be spelt out. */
function stem(word: string, spelled: boolean) {
  if (!spelled && !word.includes(" ") && word.length < 6) return esc(word);
  return word.split(" ").map((part) => {
    const runs = part.match(/(.)\1*/g) ?? [];
    return runs.map((run, i) => {
      const c = esc(run[0]);
      const letter = run.length > 1 ? `${c}{${run.length},}` : `${c}+`;
      const inner = i > 0 && i < runs.length - 1;
      return inner ? `(?:${letter}|${MASK}+)` : letter;
    }).join(spelled ? SEP : "");
  }).join("\\s+");
}

const byLength = (a: string, b: string) => b.length - a.length;
const PATTERN = new RegExp(
  `(?<![a-z])(?:${[...LONG].sort(byLength).map((w) => stem(w, w.length >= 4)).join("|")}|${[...SHORT].sort(byLength).map((w) => stem(w, false)).join("|")})${ENDINGS}(?![a-z])`,
  "i",
);

/** True when the text contains a swear word or slur. */
export function hasProfanity(text: string) {
  const t = normalise(text);
  // Also check with spaced-out single letters joined up, for "s h i t" and "a s s".
  const joined = t.replace(/(?<![a-z])([a-z])(?:[\s._\-*]+([a-z])(?![a-z]))+/g, (m) => m.replace(/[^a-z]/g, ""));
  return PATTERN.test(t) || (joined !== t && PATTERN.test(joined));
}

/** The message shown when text is refused. */
export const PROFANITY_ERROR = "Please keep it respectful. That contains language we don't allow.";
