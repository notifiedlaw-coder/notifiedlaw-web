CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`read_at` integer,
	`expires_at` integer,
	FOREIGN KEY (`from_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_pair` ON `message` (`from_id`,`to_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `message_to_unread` ON `message` (`to_id`,`read_at`);--> statement-breakpoint
CREATE INDEX `message_expires` ON `message` (`expires_at`);