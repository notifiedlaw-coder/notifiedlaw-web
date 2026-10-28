export type NavItem = {
  href: string;
  label: string;
  icon: string; // key into components/icons
  badge?: string;
  proLock?: boolean;
};

export const NAV_TOP: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/hot-topics", label: "Hot Topics", icon: "headphones" },
];

export const NAV_STUDY: NavItem[] = [
  { href: "/library", label: "Library", icon: "book" },
  { href: "/exam-prep", label: "Exam Prep", icon: "check" },
];

export const NAV_RESEARCH: NavItem[] = [
  { href: "/case-law", label: "Case Law", icon: "scales" },
  { href: "/articles", label: "Articles", icon: "doc" },
];

export function titleFor(pathname: string): { title: string; sub: string } {
  const map: [string, string, string][] = [
    ["/dashboard", "Home", ""],
    ["/hot-topics", "Hot Topics Podcast", "Latest in Accra, with the law behind it"],
    ["/articles", "Articles", "Explainers on Ghanaian law"],
    ["/library", "Library", "Course notes by level"],
    ["/exam-prep", "Exam Prep", "Mock questions"],
    ["/case-law", "Case Law", "Case briefs"],
    ["/settings", "Settings", "Profile and preferences"],
    ["/plans", "Plans", "Choose how you study"],
    ["/checkout", "Checkout", "Mobile money"],
  ];
  const hit = map.find(([p]) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? { title: hit[1], sub: hit[2] } : { title: "NotifiedLaw", sub: "" };
}
