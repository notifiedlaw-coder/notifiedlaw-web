import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The four tables Better Auth needs. App data (plans, progress, streaks) gets its own tables below.
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

// What onboarding collects. One row per user; its absence means onboarding is not done.
export const profile = sqliteTable("profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  dob: text("dob").notNull(), // ISO date, YYYY-MM-DD
  gender: text("gender").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("student"), // student | employed | exploring
  // The questions after status are all optional, and only the set for the chosen status is kept.
  university: text("university"),
  level: text("level"),
  jobTitle: text("job_title"),
  employer: text("employer"),
  sector: text("sector"),
  intent: text("intent"),
  goals: text("goals").notNull().default("[]"), // JSON array of goal labels
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// The user's plan and Notify Credits. No row yet means Free with an empty balance.
export const subscription = sqliteTable("subscription", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("Free"),
  creditsUsed: integer("credits_used").notNull().default(0),
  creditsExtra: integer("credits_extra").notNull().default(0),
  // Set once, when a university email is verified: Pro until this time. Never cleared, so it also records
  // that the account has had its one trial.
  trialEndsAt: integer("trial_ends_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Verified university emails. The address is the key, so each one can back only one account, ever: there is
// no foreign key to user, so deleting the account does not free the address for a second trial.
export const uniEmail = sqliteTable("uni_email", {
  email: text("email").primaryKey(), // normalised: lower-case, no +tag
  userId: text("user_id").notNull().unique(), // one verified address per account
  university: text("university").notNull(),
  verifiedAt: integer("verified_at", { mode: "timestamp_ms" }).notNull(),
});

// A verification link waiting to be clicked; at most one per user. Only a hash of the token is stored.
// Pending rows do not reserve the address, so nobody can block someone else's email by requesting it first.
export const uniEmailRequest = sqliteTable("uni_email_request", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  university: text("university").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull(),
  // Daily cap on links: how many were sent since windowStart. Kept when the address is changed.
  sends: integer("sends").notNull().default(1),
  windowStart: integer("window_start", { mode: "timestamp_ms" }), // null: rows from before the cap
});

// Content synced from the Notion "LAW DATABASE". One flexible table for every kind of page so a new Notion
// section needs no migration. Only rows with published = 1 are shown on the site.
export const cmsEntry = sqliteTable("cms_entry", {
  id: text("id").primaryKey(), // Notion page id
  kind: text("kind").notNull(), // course | topic | case | article | episode | question
  parentId: text("parent_id"), // topic -> its course page id
  level: text("level"), // 100 | 200 | 300 | 400 | pre-bar | bar
  semester: text("semester"), // "1" | "2"
  title: text("title").notNull(),
  slug: text("slug").notNull(), // courses: the site course slug; others: url slug
  position: integer("position").notNull().default(0),
  props: text("props").notNull().default("{}"), // JSON of the remaining Notion properties
  body: text("body").notNull().default(""), // page content as Markdown
  stage: text("stage"), // Draft | Review | Publish, as set in Notion
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  notionEditedAt: text("notion_edited_at"),
  syncedAt: integer("synced_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("cms_entry_kind_published").on(t.kind, t.published), index("cms_entry_parent").on(t.parentId)]);

// Law quotes shown on the dashboard. Add or retire rows in D1; only active = 1 rows are shown, one picked at random.
export const quote = sqliteTable("quote", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  author: text("author").notNull(),
  source: text("source"), // case, book or speech the words come from
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
