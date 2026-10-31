import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  // A plan granted by a promo code, on top of the plan above, until promoUntil. It never replaces `plan`, so a
  // Student plan is still there when the promo ends.
  promoPlan: text("promo_plan"),
  promoUntil: integer("promo_until", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Promo codes each account has used, so a code works once per account.
export const promoRedemption = sqliteTable("promo_redemption", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  redeemedAt: integer("redeemed_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.code] })]);

// Notes a reader pins to a passage of a library topic. `quote` is the highlighted text, `before` the few
// characters ahead of it (to tell repeated phrases apart), `chapter` the 0-based chapter it was in.
// Keyed on the topic's Notion page id, so a note stays with its topic when topics are reordered.
export const topicNote = sqliteTable("topic_note", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  chapter: integer("chapter").notNull(),
  quote: text("quote").notNull(),
  before: text("before").notNull().default(""),
  note: text("note").notNull(),
  // A highlight colour from NOTE_COLORS.
  color: text("color").notNull().default("yellow"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("topic_note_user_topic").on(t.userId, t.topicId)]);

// Topics a user has marked as studied, one row each. Keyed on the topic's Notion page id, like topic_note.
export const topicProgress = sqliteTable("topic_progress", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.topicId] })]);

// Case briefs a user has bookmarked, one row each. Keyed on the case's Notion page id, like topic_progress.
export const caseBookmark = sqliteTable("case_bookmark", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  caseId: text("case_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.caseId] })]);

// Friend requests and friendships, one row per pair: `fromId` asked, `toId` was asked. Accepting keeps the row and
// moves it to accepted; declining, cancelling and unfriending delete it. The API never lets a reverse row exist.
export const friendship = sqliteTable("friendship", {
  fromId: text("from_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  toId: text("to_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | accepted
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
}, (t) => [primaryKey({ columns: [t.fromId, t.toId] }), index("friendship_to").on(t.toId)]);

// Messages between friends. Sending sets expiresAt to 90 days on; opening the conversation as the recipient sets readAt
// and brings expiresAt forward to readAt + 30 days if that is sooner;
// reads skip anything past expiresAt, and the Worker's daily cron (custom-worker.ts) deletes it. Unfriending deletes
// the whole conversation.
export const message = sqliteTable("message", {
  id: text("id").primaryKey(),
  fromId: text("from_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  toId: text("to_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
}, (t) => [
  index("message_pair").on(t.fromId, t.toId, t.createdAt),
  index("message_to_unread").on(t.toId, t.readAt),
  index("message_expires").on(t.expiresAt),
]);

// Profile pictures: 256 px WebP in the private FILES bucket under `key`, made by the Images binding from the upload.
export const userAvatar = sqliteTable("user_avatar", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// Group chats. The creator is the group's only admin (ownerId); at most MAX_OWNED_GROUPS per account, MAX_GROUP_MEMBERS each.
export const chatGroup = sqliteTable("chat_group", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  avatarKey: text("avatar_key"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("chat_group_owner").on(t.ownerId)]);

// Who is in each group, the admin included. `lastReadAt` counts unread messages.
export const groupMember = sqliteTable("group_member", {
  groupId: text("group_id").notNull().references(() => chatGroup.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.groupId, t.userId] }), index("group_member_user").on(t.userId)]);

// Group messages, deleted 90 days after they are sent (expiresAt), read or not.
export const groupMessage = sqliteTable("group_message", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => chatGroup.id, { onDelete: "cascade" }),
  fromId: text("from_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("group_message_group").on(t.groupId, t.createdAt), index("group_message_expires").on(t.expiresAt)]);

// Voice and video calls through Cloudflare Realtime (SFU). A direct call has calleeId; a group call has groupId.
// Every call ends by endsAt (3 hours after it starts); endReason: declined | missed | ended | time.
export const call = sqliteTable("call", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => chatGroup.id, { onDelete: "cascade" }),
  callerId: text("caller_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  calleeId: text("callee_id").references(() => user.id, { onDelete: "cascade" }),
  video: integer("video", { mode: "boolean" }).notNull().default(false),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }),
  endReason: text("end_reason"),
}, (t) => [index("call_group").on(t.groupId, t.endedAt), index("call_callee").on(t.calleeId, t.endedAt), index("call_open").on(t.endedAt, t.endsAt)]);

// Who is or was in a call: their SFU session, the tracks they publish (JSON [{ name, mid }]) and the tracks they
// pull from others (JSON [{ key: "<session>:<track>", mid }]), so a pull is not repeated and can be closed when the
// person loses access. Present while leftAt is null and seenAt is recent (the call screen polls).
export const callParticipant = sqliteTable("call_participant", {
  callId: text("call_id").notNull().references(() => call.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  tracks: text("tracks").notNull().default("[]"),
  pulled: text("pulled").notNull().default("[]"),
  joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
  seenAt: integer("seen_at", { mode: "timestamp_ms" }).notNull(),
  leftAt: integer("left_at", { mode: "timestamp_ms" }),
}, (t) => [primaryKey({ columns: [t.callId, t.userId] }), index("call_participant_user").on(t.userId, t.leftAt)]);

// Blocks: the blocked account cannot send the blocker friend requests, messages, calls or group invitations.
export const userBlock = sqliteTable("user_block", {
  blockerId: text("blocker_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index("user_block_blocked").on(t.blockedId)]);

// Who is typing where, for the typing bubble. `chat` is "u:<recipient id>" for a direct chat or "g:<group id>". A row
// lives a few seconds past the last keystroke (`untilAt`), is cleared when the message is sent, and the cron sweeps
// the rest. Readers get it with the polls they already make, so typing costs the sender one write every few seconds.
export const typing = sqliteTable("typing", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  chat: text("chat").notNull(),
  untilAt: integer("until_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.chat] }), index("typing_chat").on(t.chat, t.untilAt)]);

// Reports of abuse, for review in D1. `target` is a user, group, message or group message id; `snapshot` keeps the
// reported text, since messages expire.
export const abuseReport = sqliteTable("abuse_report", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // user | group | message | group_message
  target: text("target").notNull(),
  reason: text("reason").notNull(),
  snapshot: text("snapshot"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("abuse_report_reporter").on(t.reporterId, t.createdAt)]);

// When each user was last in the app and their daily streak, for Friend activity. Written by the shell's heartbeat
// (POST /api/activity). A day counts once the app is opened on it (UTC, Ghana's time); `streakDay` is the last such day,
// so a streak whose day is older than yesterday has lapsed and reads as 0.
export const activity = sqliteTable("activity", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  streak: integer("streak").notNull().default(1),
  bestStreak: integer("best_streak").notNull().default(1),
  streakDay: text("streak_day").notNull(), // YYYY-MM-DD
});

// AI comparisons of two case briefs, kept so the same pair is never paid for twice. `pair` is the two Notion page ids
// in sorted order; `digest` is a hash of both briefs and the prompt version, so edited briefs are compared afresh.
export const caseComparison = sqliteTable("case_comparison", {
  pair: text("pair").primaryKey(),
  digest: text("digest").notNull(),
  result: text("result").notNull(), // JSON, src/lib/compare.ts Comparison
  model: text("model").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// AI comparisons generated by a user today (a cache hit is free); one row per user, reset when the day changes.
export const aiDay = sqliteTable("ai_day", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  day: text("day").notNull(), // YYYY-MM-DD, UTC
  runs: integer("runs").notNull(),
});

// Notified AI conversations, private to their owner. The title is the first question, shortened.
export const aiChat = sqliteTable("ai_chat", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("ai_chat_user").on(t.userId, t.updatedAt)]);

// One message of a conversation. `files` is JSON [{ kind, id, name, href }] (src/lib/ai/refs.ts): on a user message the
// files, cases and topics @-mentioned, on an answer the sources it was given (older rows hold [{ id, name }]: files).
export const aiMessage = sqliteTable("ai_message", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => aiChat.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  files: text("files").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (t) => [index("ai_message_chat").on(t.chatId, t.createdAt)]);

// The text read out of a My Files document for Notified AI, kept so it is read once. Dropped with the file.
export const fileText = sqliteTable("file_text", {
  fileId: text("file_id").primaryKey().references(() => userFile.id, { onDelete: "cascade" }),
  sha256: text("sha256").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
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

// Sessions ended because the account signed in on another device, by SHA-256 of the session token, so the old
// device can be told why it was signed out. Rows older than the longest session lifetime are pruned on sign-in.
export const endedSession = sqliteTable("ended_session", {
  tokenHash: text("token_hash").primaryKey(),
  endedAt: integer("ended_at", { mode: "timestamp_ms" }).notNull(),
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
  kind: text("kind").notNull(), // course | topic | case | article | episode | question | columns (a section database's columns; slug is its kind)
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
}, (t) => [
  index("cms_entry_kind_published").on(t.kind, t.published),
  index("cms_entry_parent").on(t.parentId),
  index("cms_entry_kind_slug").on(t.kind, t.slug), // page lookups by slug
]);

// Tags on an entry (articles today), from the Notion TAGS column. One row per tag so a tag can be indexed and filtered.
export const articleTag = sqliteTable("article_tag", {
  entryId: text("entry_id").notNull().references(() => cmsEntry.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(), // display name, e.g. "Defamation"
  slug: text("slug").notNull(), // url form, e.g. "defamation"
}, (t) => [primaryKey({ columns: [t.entryId, t.slug] }), index("article_tag_slug").on(t.slug)]);

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

// Study TimeTable: one per user, private to its owner. `input` is the JSON TimetableInput from lib/timetable:
// courses with their exams, weekly free time, and the planner's session and break length.
export const timetable = sqliteTable("timetable", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  input: text("input").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// The TimeTable's study sessions, one row each so the student can move, change, add and delete them on the
// calendar. `courseId` is a course id inside the owner's timetable input. Times are HH:MM; end may be 24:00.
export const timetableSession = sqliteTable("timetable_session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  review: integer("review", { mode: "boolean" }).notNull().default(false), // the final review before an exam
  auto: integer("auto", { mode: "boolean" }).notNull().default(false), // placed by the planner, so replaced when it runs again
}, (t) => [index("timetable_session_user_date").on(t.userId, t.date)]);
