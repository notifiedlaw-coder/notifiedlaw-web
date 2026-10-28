CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`dob` text NOT NULL,
	`gender` text NOT NULL,
	`phone` text,
	`university` text NOT NULL,
	`level` text NOT NULL,
	`goals` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'Free' NOT NULL,
	`credits_used` integer DEFAULT 0 NOT NULL,
	`credits_extra` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
