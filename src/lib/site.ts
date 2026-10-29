// Relative, not "@/": next.config.ts imports this file, and path aliases do not resolve there.
import { PLAN_PRICES, cedis } from "./content";
export const SITE = {
  name: "NotifiedLaw",
  url: "https://notifiedlaw.com",
  tagline: "The Law at Your Fingertips",
  description:
    "Notes, podcasts and exam prep for every Ghanaian law course, from Level 100 to the Bar Course.",
  locale: "en_GH",
  ogImage: "/landing/hero.jpg",
} as const;

/**
 * Demo billing: lets the client change its own plan and credits. Development only. In production the plan
 * and credit balance are decided by the server and database, never by the browser.
 */
export const DEMO_BILLING = process.env.NODE_ENV !== "production";

export const abs = (path = "/") => new URL(path, SITE.url).toString();

/** Routes behind the app shell that hold per-user state. Kept out of search and AI indexes. */
export const PRIVATE_PATHS = [
  "/dashboard", "/settings", "/checkout", "/onboarding", "/exam-prep", "/hot-topics", "/plans", "/login",
  "/ai", "/flashcards", "/leaderboard", "/files", "/verify-email",
] as const;

export const FAQ = [
  {
    q: "What is NotifiedLaw?",
    a: "NotifiedLaw is a study platform for Ghanaian law students. It offers course notes, case law briefs, articles, a Hot Topics podcast and expertly marked exam practice for every law course from Level 100 to the Bar Course.",
  },
  {
    q: "Which courses and levels does NotifiedLaw cover?",
    a: "NotifiedLaw covers Levels 100 to 400, the Pre-Bar course and the Bar Course, with notes written to match Ghanaian law faculty outlines, such as Constitutional Law, Land Law and Criminal Law.",
  },
  {
    q: "How much does NotifiedLaw cost?",
    a: `There is no free plan. Student costs ${cedis(PLAN_PRICES.Student)} per month and opens every topic from Level 100 to 400. Senior Judicial costs ${cedis(PLAN_PRICES.Pro)} per month and adds Notified AI. Supreme Justice costs ${cedis(PLAN_PRICES["Pro Max"])} per month and adds Pre-Bar, the Bar Course and exam prep. The first 2 topics of every course are open to everyone as a preview.`,
  },
  {
    q: "Can I pay with mobile money?",
    a: "Yes. NotifiedLaw accepts MTN MoMo, Telecel Cash and AT Money.",
  },
  {
    q: "How do students get the Student plan?",
    a: "Choose Student when you sign up and enter your university email. We email you a link to confirm it, then you add your name and student ID and choose your plan. Each university email and student ID can be used for one account, and student status is checked again each year.",
  },
  {
    q: "How does exam marking work?",
    a: "You answer timed past questions and receive expert marking with written feedback before your real examiner sees your work.",
  },
] as const;
