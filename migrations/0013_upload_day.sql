CREATE TABLE `upload_day` (
	`user_id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`files` integer NOT NULL,
	`bytes` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
