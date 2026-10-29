// Site configuration: status badges, onboarding options and pricing. Study content comes from Notion (see lib/cms.ts).

export type Treatment =
  | "good" | "inforce" | "amended" | "repealed"
  | "followed" | "applied" | "considered" | "distinguished"
  | "checking" | "unchecked";

export const BADGES: Record<Treatment, { label: string; bg: string; fg: string }> = {
  good: { label: "Good law", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  inforce: { label: "In force", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  amended: { label: "Amended", bg: "rgba(255,149,0,0.14)", fg: "#C93400" },
  repealed: { label: "Repealed", bg: "rgba(255,59,48,0.12)", fg: "#D70015" },
  followed: { label: "Followed", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  applied: { label: "Applied", bg: "rgba(52,199,89,0.14)", fg: "#248A3D" },
  considered: { label: "Considered", bg: "rgba(0,122,255,0.1)", fg: "#0062CC" },
  distinguished: { label: "Distinguished", bg: "rgba(255,149,0,0.14)", fg: "#C93400" },
  checking: { label: "Open to check", bg: "rgba(0,122,255,0.1)", fg: "#0062CC" },
  unchecked: { label: "Not checked", bg: "rgba(118,118,128,0.12)", fg: "rgba(60,60,67,0.8)" },
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

