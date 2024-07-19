/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/

ALTER TABLE transform_merge_request_fact_dates_junk ADD `started_deploy_at` DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE transform_merge_request_metrics ADD `deploy_duration` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

PRAGMA foreign_keys=off;--> statement-breakpoint
ALTER TABLE transform_merge_request_fact_dates_junk RENAME TO _transform_merge_request_fact_dates_junk_old;--> statement-breakpoint
ALTER TABLE transform_merge_request_metrics RENAME TO _transform_merge_request_metrics_old;--> statement-breakpoint

CREATE TABLE `transform_merge_request_fact_dates_junk` (
	`id` integer PRIMARY KEY NOT NULL,
	`merged_at` integer NOT NULL,
	`opened_at` integer NOT NULL,
	`closed_at` integer NOT NULL,
	`last_updated_at` integer NOT NULL,
	`started_coding_at` integer NOT NULL,
	`started_pickup_at` integer NOT NULL,
	`started_review_at` integer NOT NULL,
  `started_deploy_at` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`merged_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opened_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`last_updated_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_coding_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_pickup_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`started_review_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`started_deploy_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint

INSERT INTO transform_merge_request_fact_dates_junk 
	SELECT `id`,
         `merged_at`,
         `opened_at`,
         `closed_at`,
         `last_updated_at`,
         `started_coding_at`,
         `started_pickup_at`,
         `started_review_at`,
         `started_deploy_at`,
         `__created_at`,
         `__updated_at`
	FROM _transform_merge_request_fact_dates_junk_old;
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
  `code_addition` integer DEFAULT 0 NOT NULL, 
  `code_deletion` integer DEFAULT 0 NOT NULL,
  `deploy_duration` integer DEFAULT 0 NOT NULL,
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
         `__created_at`,
         `__updated_at`,
         `code_addition`,
         `code_deletion`,
         `deploy_duration`
	FROM _transform_merge_request_metrics_old;
--> statement-breakpoint

DROP TABLE `_transform_merge_request_metrics_old`;--> statement-breakpoint
DROP TABLE `_transform_merge_request_fact_dates_junk_old`;--> statement-breakpoint

CREATE INDEX `merge_request_metrics_users_junk_idx` ON `transform_merge_request_metrics` (`users_junk`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_dates_junk_idx` ON `transform_merge_request_metrics` (`dates_junk`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_repository_idx` ON `transform_merge_request_metrics` (`repository`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_merge_request_idx` ON `transform_merge_request_metrics` (`merge_request`);--> statement-breakpoint
PRAGMA foreign_keys=on;