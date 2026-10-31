CREATE TABLE `promo_mailbox` (
	`mailbox` text NOT NULL,
	`code` text NOT NULL,
	`redeemed_at` integer NOT NULL,
	PRIMARY KEY(`mailbox`, `code`)
);
