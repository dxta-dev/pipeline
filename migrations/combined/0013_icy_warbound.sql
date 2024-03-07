CREATE TABLE `transform_branches` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `branches_name_idx` ON `transform_branches` (`name`);--> statement-breakpoint
INSERT INTO `transform_branches` (id, name) VALUES (1, '');--> statement-breakpoint

ALTER TABLE transform_merge_requests ADD `target_branch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE transform_merge_requests ADD `source_branch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE transform_null_rows ADD `branch_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint

PRAGMA foreign_keys=off;--> statement-breakpoint
ALTER TABLE transform_merge_requests RENAME TO _transform_merge_requests_old;--> statement-breakpoint
ALTER TABLE transform_merge_request_events RENAME TO _transform_merge_request_events_old;--> statement-breakpoint
CREATE TABLE `transform_merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`description` text DEFAULT '',
	`canon_id` integer DEFAULT -1 NOT NULL,
	`target_branch` integer DEFAULT 1 NOT NULL,
	`source_branch` integer DEFAULT 1 NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`target_branch`) REFERENCES `transform_branches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_branch`) REFERENCES `transform_branches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO transform_merge_requests 
	SELECT `id`,
				 `external_id`,
				 `forge_type`,
				 `title`,
				 `web_url`,
				 `description`,
				 `canon_id`,
				 `target_branch`,
				 `source_branch`,
				 `__created_at`,
				 `__updated_at`
	FROM _transform_merge_requests_old;
--> statement-breakpoint

ALTER TABLE transform_merge_request_metrics RENAME TO _transform_merge_request_metrics_old;--> statement-breakpoint
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
	`code_addition` integer DEFAULT -1 NOT NULL,
	`code_deletion` integer DEFAULT -1 NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`users_junk`) REFERENCES `transform_merge_request_fact_users_junk`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`repository`) REFERENCES `transform_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merge_request`) REFERENCES `transform_merge_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dates_junk`) REFERENCES `transform_merge_request_fact_dates_junk`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO transform_merge_request_metrics
	SELECT `id`,
				 `users_junk`,
				 `repository`,
				 `merge_request`,
				 `dates_junk`,
				 `mr_size`,
				 `coding_duration`,
				 `review_start_delay`,
				 `review_duration`,
				 `handover`,
				 `review_depth`,
				 `merged`,
				 `closed`,
				 `approved`,
				 `reviewed`,
				 `code_addition`,
				 `code_deletion`,
				 `__created_at`,
				 `__updated_at`
	FROM _transform_merge_request_metrics_old;
--> statement-breakpoint

CREATE TABLE `transform_merge_request_events` (
	`id` integer PRIMARY KEY NOT NULL,
	`actor` integer NOT NULL,
	`subject` integer NOT NULL,
	`occured_on` integer NOT NULL,
	`commited_at` integer NOT NULL,
	`repository` integer NOT NULL,
	`merge_request` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`review_state_type` integer NOT NULL,
	`merge_request_event_type` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`actor`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject`) REFERENCES `transform_forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`occured_on`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commited_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`repository`) REFERENCES `transform_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merge_request`) REFERENCES `transform_merge_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO transform_merge_request_events 
	SELECT `id`,
				 `actor`,
				 `subject`,
				 `occured_on`,
				 `commited_at`,
				 `repository`,
				 `merge_request`,
				 `timestamp`,
				 `review_state_type`,
				 `merge_request_event_type`,
				 `__created_at`,
				 `__updated_at`
	FROM _transform_merge_request_events_old;
--> statement-breakpoint
PRAGMA foreign_keys=on;
