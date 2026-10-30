CREATE TABLE `article_tag` (
	`entry_id` text NOT NULL,
	`tag` text NOT NULL,
	`slug` text NOT NULL,
	PRIMARY KEY(`entry_id`, `slug`),
	FOREIGN KEY (`entry_id`) REFERENCES `cms_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `article_tag_slug` ON `article_tag` (`slug`);--> statement-breakpoint
CREATE INDEX `cms_entry_kind_slug` ON `cms_entry` (`kind`,`slug`);