export type NavItem = {
  href: string;
  label: string;
  icon: string; // key into components/icons
  badge?: string;
  proLock?: boolean;
};

export const NAV_TOP: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/ai", label: "Notified AI", icon: "sparkle" },
  { href: "/hot-topics", label: "Hot Topics", icon: "headphones" },
];

export const NAV_STUDY: NavItem[] = [
  { href: "/library", label: "Library", icon: "book" },
  { href: "/flashcards", label: "Flashcards", icon: "cards" },
  { href: "/exam-prep", label: "Exam Prep", icon: "check" },
  { href: "/timetable", label: "TimeTable", icon: "calendar" },
  { href: "/leaderboard", label: "Leaderboard", icon: "trophy", proLock: true },
];

export const NAV_RESEARCH: NavItem[] = [
  { href: "/case-law", label: "Case Law", icon: "scales" },
  { href: "/articles", label: "Articles", icon: "doc" },
  { href: "/files", label: "My Files", icon: "folder" },
];

export function titleFor(pathname: string): { title: string; sub: string } {
  const map: [string, string, string][] = [
    ["/dashboard", "Home", ""],
    ["/ai", "Notified AI", "Ghanaian law only"],
    ["/hot-topics", "Hot Topics Podcast", "Latest in Accra, with the law behind it"],
    ["/articles", "Articles", "Explainers on Ghanaian law"],
    ["/library", "Library", "Course notes by level"],
    ["/flashcards", "Flashcards", "Review key points by course"],
    ["/exam-prep", "Exam Prep", "Mock questions"],
    ["/timetable", "TimeTable", "Your personal study plan"],
    ["/leaderboard", "Leaderboard", "Weekly quiz"],
    ["/case-law", "Case Law", "Case Briefs on Cases"],
    ["/files", "My Files", "Your uploaded notes"],
    ["/settings", "Settings", "Profile and preferences"],
    ["/plans", "Plans", "Choose how you study"],
    ["/checkout", "Checkout", "Mobile money"],
  ];
  const hit = map.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? { title: hit[1], sub: hit[2] } : { title: "NotifiedLaw", sub: "" };
}
