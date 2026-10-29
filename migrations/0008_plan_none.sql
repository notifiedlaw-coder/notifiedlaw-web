PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_subscription` (
	`user_id` text PRIMARY KEY NOT NULL,
	`plan` text DEFAULT 'None' NOT NULL,
	`credits_used` integer DEFAULT 0 NOT NULL,
	`credits_extra` integer DEFAULT 0 NOT NULL,
	`trial_ends_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subscription`("user_id", "plan", "credits_used", "credits_extra", "trial_ends_at", "updated_at") SELECT "user_id", CASE WHEN "plan" IN ('Student', 'Pro', 'Pro Max') THEN "plan" ELSE 'None' END, "credits_used", "credits_extra", "trial_ends_at", "updated_at" FROM `subscription`;--> statement-breakpoint
DROP TABLE `subscription`;--> statement-breakpoint
ALTER TABLE `__new_subscription` RENAME TO `subscription`;--> statement-breakpoint
PRAGMA foreign_keys=ON;