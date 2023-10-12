CREATE TABLE `crawl_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`crawl_id` integer NOT NULL,
	`type` integer NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')),
	`data` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`crawl_id`) REFERENCES `crawls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crawls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer DEFAULT (strftime('%s', 'now')),
	`user_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
