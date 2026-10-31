CREATE TABLE `typing` (
	`user_id` text NOT NULL,
	`chat` text NOT NULL,
	`until_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `chat`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `typing_chat` ON `typing` (`chat`,`until_at`);