CREATE TABLE `cms_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`parent_id` text,
	`level` text,
	`semester` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`props` text DEFAULT '{}' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`stage` text,
	`published` integer DEFAULT false NOT NULL,
	`notion_edited_at` text,
	`synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cms_entry_kind_published` ON `cms_entry` (`kind`,`published`);--> statement-breakpoint
CREATE INDEX `cms_entry_parent` ON `cms_entry` (`parent_id`);