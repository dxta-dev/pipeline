CREATE TABLE `dates` (
	`id` integer PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`week` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `forge_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `merge_request_fact_dates_junk` (
	`id` integer PRIMARY KEY NOT NULL,
	`merged_at` integer NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer NOT NULL,
	`last_updated_at` integer NOT NULL,
	`started_coding_at` integer NOT NULL,
	`started_pickup_at` integer NOT NULL,
	`started_review_at` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`merged_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opened_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_updated_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_coding_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_pickup_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_review_at`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `merge_request_facts` (
	`id` integer PRIMARY KEY NOT NULL,
	`users_junk` integer NOT NULL,
	`repository` integer NOT NULL,
	`merge_request` integer NOT NULL,
	`dates_junk` integer NOT NULL,
	`mr_size` integer NOT NULL,
	`coding_duration` integer NOT NULL,
	`review_start_delay` integer NOT NULL,
	`review_duration` integer NOT NULL,
	`handover` integer NOT NULL,
	`review_depth` integer NOT NULL,
	`merged` integer NOT NULL,
	`closed` integer NOT NULL,
	`approved` integer NOT NULL,
	`reviewed` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`users_junk`) REFERENCES `merge_request_fact_users_junk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`repository`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merge_request`) REFERENCES `merge_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dates_junk`) REFERENCES `merge_request_fact_dates_junk`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `merge_request_fact_users_junk` (
	`id` integer PRIMARY KEY NOT NULL,
	`author` integer NOT NULL,
	`merged_by` integer NOT NULL,
	`approver1` integer NOT NULL,
	`approver2` integer NOT NULL,
	`approver3` integer NOT NULL,
	`approver4` integer NOT NULL,
	`approver5` integer NOT NULL,
	`approver6` integer NOT NULL,
	`approver7` integer NOT NULL,
	`approver8` integer NOT NULL,
	`approver9` integer NOT NULL,
	`approver10` integer NOT NULL,
	`commiter1` integer NOT NULL,
	`commiter2` integer NOT NULL,
	`commiter3` integer NOT NULL,
	`commiter4` integer NOT NULL,
	`commiter5` integer NOT NULL,
	`commiter6` integer NOT NULL,
	`commiter7` integer NOT NULL,
	`commiter8` integer NOT NULL,
	`commiter9` integer NOT NULL,
	`commiter10` integer NOT NULL,
	`reviewer1` integer NOT NULL,
	`reviewer2` integer NOT NULL,
	`reviewer3` integer NOT NULL,
	`reviewer4` integer NOT NULL,
	`reviewer5` integer NOT NULL,
	`reviewer6` integer NOT NULL,
	`reviewer7` integer NOT NULL,
	`reviewer8` integer NOT NULL,
	`reviewer9` integer NOT NULL,
	`reviewer10` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`author`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merged_by`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver1`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver2`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver3`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver4`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver5`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver6`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver7`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver8`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver9`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver10`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter1`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter2`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter3`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter4`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter5`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter6`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter7`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter8`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter9`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commiter10`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer1`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer2`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer3`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer4`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer5`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer6`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer7`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer8`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer9`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer10`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dates_day_week_month_year_idx` ON `dates` (`day`,`week`,`month`,`year`);--> statement-breakpoint
CREATE UNIQUE INDEX `forge_users_external_id_forge_type_idx` ON `forge_users` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_requests_external_id_forge_type_idx` ON `merge_requests` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_forge_type_idx` ON `repositories` (`external_id`,`forge_type`);