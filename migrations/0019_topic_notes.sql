CREATE TABLE `topic_note` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`chapter` integer NOT NULL,
	`quote` text NOT NULL,
	`before` text DEFAULT '' NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `topic_note_user_topic` ON `topic_note` (`user_id`,`topic_id`);