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
export const UNIVERSITIES = [
  { name: "Accra Metropolitan University" },
  { name: "Ashesi University" },
  { name: "Central University" },
  { name: "GIMPA" },
  { name: "Greenfield University" },
  { name: "KAAF University" },
  { name: "Kings University" },
  { name: "KNUST" },
  { name: "Lancaster University Ghana" },
  { name: "Mountcrest University" },
  { name: "Pentecost University" },
  { name: "Presbyterian University" },
  { name: "SDD-UBIDS" },
  { name: "University of Cape Coast" },
  { name: "University of Development Studies" },
  { name: "University of Ghana" },
  { name: "UPSA" },
  { name: "Wisconsin International University College" },
  { name: "Zenith University College" },
];

export const NETWORKS = [
  { label: "MTN MoMo", mark: "MTN", bg: "#FFCB05", fg: "#1D1D1F" },
  { label: "Telecel Cash", mark: "T", bg: "#E60000", fg: "#FFFFFF" },
  { label: "AT Money", mark: "AT", bg: "#0066B3", fg: "#FFFFFF" },
];

export const PRICES = {
  month: { pro: "GH₵45", max: "GH₵85", per: "/ month" },
  semester: { pro: "GH₵150", max: "GH₵290", per: "/ semester" },
};

/** Extra Notify Credits any plan can buy. They never expire. Placeholder prices. */
export const CREDIT_PACKS = [
  { id: "50", credits: 50, price: "GH₵15" },
  { id: "150", credits: 150, price: "GH₵40", tag: "BEST VALUE" },
  { id: "400", credits: 400, price: "GH₵95" },
];

