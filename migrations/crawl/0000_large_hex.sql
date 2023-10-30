CREATE TABLE `events` (
	`id` integer PRIMARY KEY NOT NULL,
	`instance_id` integer NOT NULL,
	`namespace` integer NOT NULL,
	`detail` integer NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')),
	`data` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`instance_id`) REFERENCES `instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `instances` (
	`id` integer PRIMARY KEY NOT NULL,
	`started_at` integer DEFAULT (strftime('%s', 'now')),
	`user_id` text NOT NULL,
	`repository_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
