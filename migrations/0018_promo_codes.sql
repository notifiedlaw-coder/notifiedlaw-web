CREATE TABLE `promo_redemption` (
	`user_id` text NOT NULL,
	`code` text NOT NULL,
	`redeemed_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `code`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `subscription` ADD `promo_plan` text;--> statement-breakpoint
ALTER TABLE `subscription` ADD `promo_until` integer;