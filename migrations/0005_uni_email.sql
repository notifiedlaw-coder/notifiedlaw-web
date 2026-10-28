CREATE TABLE `uni_email` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`university` text NOT NULL,
	`verified_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uni_email_user_id_unique` ON `uni_email` (`user_id`);--> statement-breakpoint
CREATE TABLE `uni_email_request` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`university` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`sent_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uni_email_request_token_hash_unique` ON `uni_email_request` (`token_hash`);--> statement-breakpoint
ALTER TABLE `subscription` ADD `trial_ends_at` integer;