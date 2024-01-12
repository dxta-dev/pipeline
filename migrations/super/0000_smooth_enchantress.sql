CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`db_url` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
