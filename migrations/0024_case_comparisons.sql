CREATE TABLE `ai_day` (
	`user_id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`runs` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `case_comparison` (
	`pair` text PRIMARY KEY NOT NULL,
	`digest` text NOT NULL,
	`result` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer NOT NULL
);
