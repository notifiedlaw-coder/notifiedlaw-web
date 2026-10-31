// Site configuration: status badges, onboarding options and pricing. Study content comes from Notion (see lib/cms.ts).

export type Treatment =
  | "good" | "inforce" | "amended" | "repealed"
  | "followed" | "applied" | "considered" | "distinguished"
  | "checking" | "unchecked";

export const BADGES: Record<Treatment, { label: string; bg: string; fg: string }> = {
  good: { label: "Good law", bg: "var(--tint)", fg: "var(--link)" },
  inforce: { label: "In force", bg: "var(--tint)", fg: "var(--link)" },
  amended: { label: "Amended", bg: "var(--peach)", fg: "var(--peach-fg)" },
  repealed: { label: "Repealed", bg: "var(--plum-bg)", fg: "var(--plum-fg)" },
  followed: { label: "Followed", bg: "var(--tint)", fg: "var(--link)" },
  applied: { label: "Applied", bg: "var(--tint)", fg: "var(--link)" },
  considered: { label: "Considered", bg: "var(--peach)", fg: "var(--peach-fg)" },
  distinguished: { label: "Distinguished", bg: "var(--peach)", fg: "var(--peach-fg)" },
  checking: { label: "Open to check", bg: "var(--fill)", fg: "var(--muted)" },
  unchecked: { label: "Not checked", bg: "var(--fill)", fg: "var(--muted)" },
};

// Ghanaian institutions that offer the law programme. Names already stored on profiles are kept as they were.
// `domains` are the institution's mail domains; a university email must be on one of them or a subdomain
// (so ug.edu.gh also covers st.ug.edu.gh). Each was checked to have MX records and the matching website.
export const UNIVERSITIES: { name: string; domains: string[] }[] = [
  { name: "Accra Metropolitan University", domains: ["accramet.edu.gh"] },
  { name: "Ashesi University", domains: ["ashesi.edu.gh"] },
  { name: "Central University", domains: ["central.edu.gh"] },
  { name: "GIMPA", domains: ["gimpa.edu.gh"] },
  { name: "Greenfield University", domains: ["gfc.edu.gh"] },
  { name: "KAAF University", domains: ["kaafuni.edu.gh"] },
  { name: "Kings University", domains: ["kuc.edu.gh"] },
  { name: "KNUST", domains: ["knust.edu.gh"] },
  { name: "Lancaster University Ghana", domains: ["lancaster.edu.gh"] },
  { name: "Mountcrest University", domains: ["mountcrestuniversity.edu.gh", "mountcrestuniversity.com"] },
  { name: "Pentecost University", domains: ["pentvars.edu.gh"] },
  { name: "Presbyterian University", domains: ["presbyuniversity.edu.gh"] },
  { name: "SDD-UBIDS", domains: ["ubids.edu.gh"] },
  { name: "University of Cape Coast", domains: ["ucc.edu.gh"] },
  { name: "University of Development Studies", domains: ["uds.edu.gh"] },
  { name: "University of Ghana", domains: ["ug.edu.gh"] },
  { name: "UPSA", domains: ["upsa.edu.gh", "upsamail.edu.gh"] },
  { name: "Wisconsin International University College", domains: ["wiuc-ghana.edu.gh"] },
  { name: "Zenith University College", domains: ["zuc.edu.gh"] },
];

export const NETWORKS = [
  { label: "MTN MoMo", mark: "MTN", bg: "#FFCB05", fg: "#1D1D1F" },
  { label: "Telecel Cash", mark: "T", bg: "#E60000", fg: "#FFFFFF" },
  { label: "AT Money", mark: "AT", bg: "#0066B3", fg: "#FFFFFF" },
];

/** Monthly price of each plan, in Ghana cedis. There is no free plan; "None" accounts only preview the library. */
export const PLAN_PRICES = { Student: 60, Pro: 160, "Pro Max": 360 } as const;
export const cedis = (n: number) => `GH₵${n}`;

