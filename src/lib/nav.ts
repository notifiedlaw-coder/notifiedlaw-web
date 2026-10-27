export type NavItem = {
  href: string;
  label: string;
  icon: string; // key into components/icons
  badge?: string;
  proLock?: boolean;
};

export const NAV_TOP: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/ai", label: "Notified AI", icon: "sparkle" },
];

export const NAV_STUDY: NavItem[] = [
  { href: "/library", label: "Library", icon: "book" },
  { href: "/flashcards", label: "Flashcards", icon: "cards", badge: "24" },
  { href: "/exam-prep", label: "Exam Prep", icon: "check" },
  { href: "/leaderboard", label: "Leaderboard", icon: "trophy", proLock: true },
];

export const NAV_RESEARCH: NavItem[] = [
  { href: "/case-law", label: "Case Law", icon: "scales" },
  { href: "/legislation", label: "Legislation", icon: "doc" },
  { href: "/files", label: "My Files", icon: "folder" },
];

// Phone bottom tabs, per the mobile prototype.
export const NAV_TABS: NavItem[] = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/library", label: "Library", icon: "book" },
  { href: "/ai", label: "AI", icon: "sparkle" },
  { href: "/search", label: "Search", icon: "search" },
  { href: "/settings", label: "Profile", icon: "user" },
];

export function titleFor(pathname: string): { title: string; sub: string } {
  const map: [string, string, string][] = [
    ["/home", "Home", "Monday, 26 October"],
    ["/ai", "Notified AI", "Ghanaian law only"],
    ["/library", "Library", "Level 200 · Constitutional Law II and more"],
    ["/flashcards", "Flashcards", "24 due today"],
    ["/exam-prep", "Exam Prep", "Practice and past papers"],
    ["/leaderboard", "Leaderboard", "Weekly quiz"],
    ["/case-law", "Case Law", "Ghana Supreme Court and Court of Appeal"],
    ["/legislation", "Legislation", "Constitution, Acts and Decrees"],
    ["/files", "My Files", "Your uploaded notes"],
    ["/search", "Search", "Cases, articles, topics"],
    ["/settings", "Settings", "Profile and preferences"],
    ["/plans", "Plans", "Choose how you study"],
    ["/checkout", "Checkout", "Mobile money"],
  ];
  const hit = map.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? { title: hit[1], sub: hit[2] } : { title: "NotifiedLaw", sub: "" };
}
