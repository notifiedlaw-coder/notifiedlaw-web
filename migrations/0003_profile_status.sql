PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text,
	`last_name` text NOT NULL,
	`dob` text NOT NULL,
	`gender` text NOT NULL,
	`phone` text,
	`status` text DEFAULT 'student' NOT NULL,
	`university` text,
	`level` text,
	`job_title` text,
	`employer` text,
	`sector` text,
	`intent` text,
	`goals` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_profile`("user_id", "first_name", "middle_name", "last_name", "dob", "gender", "phone", "university", "level", "goals", "created_at", "updated_at") SELECT "user_id", "first_name", "middle_name", "last_name", "dob", "gender", "phone", "university", "level", "goals", "created_at", "updated_at" FROM `profile`;--> statement-breakpoint
DROP TABLE `profile`;--> statement-breakpoint
ALTER TABLE `__new_profile` RENAME TO `profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;