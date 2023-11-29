CREATE TABLE `null_rows` (
	`id` integer PRIMARY KEY NOT NULL,
	`dates_id` integer NOT NULL,
	`users_id` integer NOT NULL,
	`merge_requests_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
