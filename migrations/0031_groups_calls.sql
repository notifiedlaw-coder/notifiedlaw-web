CREATE TABLE `abuse_report` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`kind` text NOT NULL,
	`target` text NOT NULL,
	`reason` text NOT NULL,
	`snapshot` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `abuse_report_reporter` ON `abuse_report` (`reporter_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `call` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text,
	`caller_id` text NOT NULL,
	`callee_id` text,
	`video` integer DEFAULT false NOT NULL,
	`started_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`ended_at` integer,
	`end_reason` text,
	FOREIGN KEY (`group_id`) REFERENCES `chat_group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`callee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `call_group` ON `call` (`group_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `call_callee` ON `call` (`callee_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `call_open` ON `call` (`ended_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `call_participant` (
	`call_id` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text NOT NULL,
	`tracks` text DEFAULT '[]' NOT NULL,
	`joined_at` integer NOT NULL,
	`seen_at` integer NOT NULL,
	`left_at` integer,
	PRIMARY KEY(`call_id`, `user_id`),
	FOREIGN KEY (`call_id`) REFERENCES `call`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `call_participant_user` ON `call_participant` (`user_id`,`left_at`);--> statement-breakpoint
CREATE TABLE `chat_group` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`avatar_key` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_group_owner` ON `chat_group` (`owner_id`);--> statement-breakpoint
CREATE TABLE `group_member` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	`last_read_at` integer NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `chat_group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_member_user` ON `group_member` (`user_id`);--> statement-breakpoint
CREATE TABLE `group_message` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`from_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `chat_group`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `group_message_group` ON `group_message` (`group_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `group_message_expires` ON `group_message` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_avatar` (
	`user_id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_block` (
	`blocker_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`blocker_id`, `blocked_id`),
	FOREIGN KEY (`blocker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocked_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_block_blocked` ON `user_block` (`blocked_id`);--> statement-breakpoint
-- Every direct message now also goes 90 days after it was sent, read or not.
UPDATE `message` SET `expires_at` = MIN(COALESCE(`expires_at`, `created_at` + 7776000000), `created_at` + 7776000000);
