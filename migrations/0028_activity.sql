CREATE TABLE `activity` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_seen_at` integer NOT NULL,
	`streak` integer DEFAULT 1 NOT NULL,
	`best_streak` integer DEFAULT 1 NOT NULL,
	`streak_day` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
