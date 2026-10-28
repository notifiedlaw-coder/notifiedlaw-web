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

export const UNIVERSITIES = [
  { name: "University of Ghana", city: "Legon, Accra" },
  { name: "KNUST", city: "Kumasi" },
  { name: "University of Cape Coast", city: "Cape Coast" },
  { name: "GIMPA", city: "Greenhill, Accra" },
  { name: "UPSA", city: "Accra" },
  { name: "Mountcrest University", city: "Accra" },
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

