CREATE TABLE `friendship` (
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`accepted_at` integer,
	PRIMARY KEY(`from_id`, `to_id`),
	FOREIGN KEY (`from_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `friendship_to` ON `friendship` (`to_id`);