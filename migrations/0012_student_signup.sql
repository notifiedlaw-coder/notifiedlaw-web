CREATE TABLE `student` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`university` text NOT NULL,
	`student_id` text,
	`verified_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_email_unique` ON `student` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `student_university_student_id` ON `student` (`university`,`student_id`);--> statement-breakpoint
CREATE TABLE `student_link` (
	`email` text PRIMARY KEY NOT NULL,
	`sent_at` integer NOT NULL,
	`sends` integer DEFAULT 1 NOT NULL,
	`window_start` integer NOT NULL
);
