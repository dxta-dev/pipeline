CREATE TABLE `crawl_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`instance_id` integer NOT NULL,
	`namespace` integer NOT NULL,
	`detail` integer NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')),
	`data` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`instance_id`) REFERENCES `crawl_instances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `crawl_instances` (
	`id` integer PRIMARY KEY NOT NULL,
	`started_at` integer DEFAULT (strftime('%s', 'now')),
	`user_id` text NOT NULL,
	`repository_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `extract_git_identities` (
	`id` integer PRIMARY KEY NOT NULL,
	`repository_id` integer NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_members` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text,
	`username` text NOT NULL,
	`email` text,
	`extracted_source` integer,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `extract_merge_request_commits` (
	`id` integer PRIMARY KEY NOT NULL,
	`merge_request_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`authored_date` integer NOT NULL,
	`committed_date` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`committer_name` text,
	`committer_email` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`merge_request_id`) REFERENCES `extract_merge_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_merge_request_diffs` (
	`id` integer PRIMARY KEY NOT NULL,
	`merge_request_id` integer NOT NULL,
	`new_path` text NOT NULL,
	`old_path` text NOT NULL,
	`a_mode` text NOT NULL,
	`b_mode` text NOT NULL,
	`new_file` integer NOT NULL,
	`renamed_file` integer NOT NULL,
	`deleted_file` integer NOT NULL,
	`diff` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`merge_request_id`) REFERENCES `extract_merge_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_merge_request_notes` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`merge_request_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`author_username` text NOT NULL,
	`author_external_id` integer NOT NULL,
	`body` text NOT NULL,
	`system` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`merge_request_id`) REFERENCES `extract_merge_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`canon_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`merged_at` integer,
	`merger_external_id` integer,
	`closed_at` integer,
	`closer_external_id` integer,
	`author_external_id` integer,
	`state` text,
	`target_branch` text,
	`source_branch` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_namespaces` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `extract_repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`namespace_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`namespace_id`) REFERENCES `extract_namespaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_repositories_to_members` (
	`repository_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`member_id`, `repository_id`),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `extract_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_timeline_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`type` integer NOT NULL,
	`merge_request_id` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`actor_name` text NOT NULL,
	`actor_id` integer,
	`actor_email` text,
	`data` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`merge_request_id`) REFERENCES `extract_merge_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transform_dates` (
	`id` integer PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`week` integer NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `transform_forge_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`bot` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `transform_merge_request_fact_dates_junk` (
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
	FOREIGN KEY (`merged_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opened_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_updated_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_coding_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_pickup_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_review_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transform_merge_request_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`actor` integer NOT NULL,
	`subject` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`commitedAt` integer NOT NULL,
	`repository` integer NOT NULL,
	`merge_request` integer NOT NULL,
	`review_state_type` integer NOT NULL,
	`merge_request_event_type` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`actor`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`timestamp`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commitedAt`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`repository`) REFERENCES `transform_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merge_request`) REFERENCES `transform_merge_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transform_merge_request_metrics` (
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
	FOREIGN KEY (`users_junk`) REFERENCES `transform_merge_request_fact_users_junk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`repository`) REFERENCES `transform_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merge_request`) REFERENCES `transform_merge_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dates_junk`) REFERENCES `transform_merge_request_fact_dates_junk`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transform_merge_request_fact_users_junk` (
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
	`committer1` integer NOT NULL,
	`committer2` integer NOT NULL,
	`committer3` integer NOT NULL,
	`committer4` integer NOT NULL,
	`committer5` integer NOT NULL,
	`committer6` integer NOT NULL,
	`committer7` integer NOT NULL,
	`committer8` integer NOT NULL,
	`committer9` integer NOT NULL,
	`committer10` integer NOT NULL,
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
	FOREIGN KEY (`author`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merged_by`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver1`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver2`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver3`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver4`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver5`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver6`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver7`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver8`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver9`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approver10`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer1`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer2`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer3`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer4`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer5`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer6`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer7`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer8`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer9`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`committer10`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer1`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer2`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer3`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer4`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer5`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer6`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer7`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer8`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer9`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer10`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transform_merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `transform_null_rows` (
	`id` integer PRIMARY KEY NOT NULL,
	`dates_id` integer NOT NULL,
	`users_id` integer NOT NULL,
	`merge_requests_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `transform_repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repository_id_email_name_idx` ON `extract_git_identities` (`repository_id`,`email`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_external_id_idx` ON `extract_members` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_request_commits_external_id_idx` ON `extract_merge_request_commits` (`merge_request_id`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `diffs_merge_request_id_newPath_idx` ON `extract_merge_request_diffs` (`merge_request_id`,`new_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_request_notes_external_id_idx` ON `extract_merge_request_notes` (`merge_request_id`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_requests_external_id_idx` ON `extract_merge_requests` (`external_id`,`repository_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `namespaces_external_id_idx` ON `extract_namespaces` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_idx` ON `extract_repositories` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `timeline_events_external_id_merge_request_id_type_idx` ON `extract_timeline_events` (`external_id`,`merge_request_id`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `dates_day_week_month_year_idx` ON `transform_dates` (`day`,`week`,`month`,`year`);--> statement-breakpoint
CREATE UNIQUE INDEX `forge_users_external_id_forge_type_idx` ON `transform_forge_users` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_requests_external_id_forge_type_idx` ON `transform_merge_requests` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_forge_type_idx` ON `transform_repositories` (`external_id`,`forge_type`);
