import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

// The user's plan and Notify Credits. No row yet means no plan (None) and an empty balance.
export const subscription = sqliteTable("subscription", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("None"), // None | Student | Pro | Pro Max
  creditsUsed: integer("credits_used").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Student accounts: the account's own email is on a university's domain. The row is written, and verifiedAt
// moved on, every time the user proves they still hold that mailbox by signing in (an emailed link, or Google
// for universities on Google Workspace). The Student plan needs a proof from the last STUDENT_VERIFY_DAYS.
// A student ID can back only one account per university; it stays null until onboarding asks for it.
export const student = sqliteTable("student", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  university: text("university").notNull(),
  studentId: text("student_id"),
  verifiedAt: integer("verified_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [uniqueIndex("student_university_student_id").on(t.university, t.studentId)]);

// Sign-in links sent to each university address, for the resend wait and the daily cap. Keyed on the
// recipient, not an account, because the account does not exist until the first link is used.
export const studentLink = sqliteTable("student_link", {
  email: text("email").primaryKey(),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }).notNull(),
  sends: integer("sends").notNull().default(1), // links sent since windowStart
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
});

// Uploads each user started today (UTC), for DAILY_UPLOADS and DAILY_UPLOAD_BYTES. One row per user, reset on a new day.
export const uploadDay = sqliteTable("upload_day", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD
  files: integer("files").notNull(),
  bytes: integer("bytes").notNull(),
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

// My Files folders. parentId null is the top level. Nesting, cycles and depth are checked by the API.
export const userFolder = sqliteTable("user_folder", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("user_folder_user").on(t.userId)]);

// My Files: one row per upload. The bytes live in the private FILES R2 bucket under `key`, which is built from
// the user id and the row id, never from the file name. Quota is the sum of `size` over the user's rows.
export const userFile = sqliteTable("user_file", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(), // cleaned display name, with its .pdf or .docx extension
  kind: text("kind").notNull(), // pdf | docx, from the file's contents, not its name
  folderId: text("folder_id"), // null: top level
  size: integer("size").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("user_file_user").on(t.userId, t.createdAt)]);
