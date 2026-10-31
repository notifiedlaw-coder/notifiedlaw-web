export type NavItem = {
  href: string;
  label: string;
  proLock?: boolean;
};

/**
 * The five destinations of the app (Hick's law: five choices, down from fourteen). A section with items
 * opens to its own sub-pages: nested in the desktop sidebar, as tabs under the top bar on tablets and phones.
 */
export type NavSection = {
  id: string;
  label: string;
  icon: string; // key into components/icons
  href: string; // where the destination opens
  items?: NavItem[];
};

export const NAV: NavSection[] = [
  { id: "today", label: "Today", icon: "home", href: "/dashboard" },
  {
    id: "study", label: "Study", icon: "book", href: "/library",
    items: [
      { href: "/library", label: "Library" },
      { href: "/flashcards", label: "Flashcards" },
      { href: "/exam-prep", label: "Exam prep" },
      { href: "/timetable", label: "Timetable" },
    ],
  },
  { id: "ai", label: "Ask AI", icon: "sparkle", href: "/ai" },
  {
    id: "research", label: "Research", icon: "scales", href: "/case-law",
    items: [
      { href: "/case-law", label: "Case law" },
      { href: "/articles", label: "Articles" },
      { href: "/hot-topics", label: "Podcast" },
      { href: "/files", label: "My files" },
    ],
  },
  {
    id: "community", label: "Community", icon: "friends", href: "/friends",
    items: [
      { href: "/friends", label: "Friends" },
      { href: "/leaderboard", label: "Leaderboard", proLock: true },
    ],
  },
];

export const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

/** The section a page belongs to, if any (Settings, Plans and Checkout belong to none). */
export function sectionFor(path: string): NavSection | undefined {
  return NAV.find((s) => isActive(path, s.href) || s.items?.some((i) => isActive(path, i.href)));
}

export function titleFor(pathname: string): { title: string; sub: string } {
  const map: [string, string, string][] = [
    ["/dashboard", "Today", "Your next step"],
    ["/ai", "Notified AI", "Ghanaian law only"],
    ["/hot-topics", "Hot Topics", "The law behind the news"],
    ["/articles", "Articles", "Explainers on Ghanaian law"],
    ["/library", "Library", "Course notes by level"],
    ["/flashcards", "Flashcards", "Review key points by course"],
    ["/exam-prep", "Exam prep", "Expertly marked"],
    ["/timetable", "Timetable", "Your study plan"],
    ["/leaderboard", "Leaderboard", "Weekly quiz"],
    ["/case-law", "Case law", "Briefs on Ghanaian cases"],
    ["/files", "My files", "Your uploaded notes"],
    ["/friends", "Community", "Friends and messages"],
    ["/settings", "Settings", "Profile and preferences"],
    ["/plans", "Plans", "Choose how you study"],
    ["/checkout", "Checkout", "Mobile money"],
  ];
  const hit = map.find(([p]) => isActive(pathname, p));
  return hit ? { title: hit[1], sub: hit[2] } : { title: "NotifiedLaw", sub: "" };
}
