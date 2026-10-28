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
  university: text("university").notNull(),
  level: text("level").notNull(),
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
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
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
