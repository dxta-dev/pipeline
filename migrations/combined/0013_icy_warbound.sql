CREATE TABLE `transform_branches` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
ALTER TABLE transform_merge_requests ADD `target_branch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
-- ALTER TABLE transform_merge_requests ADD `source_branch` integer DEFAULT 1 NOT NULL;
ALTER TABLE transform_null_rows ADD `branch_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `branches_name_idx` ON `transform_branches` (`name`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/
PRAGMA foreign_keys=off;--> statement-breakpoint
INSERT INTO `transform_branches` (id, name) VALUES (1, '');--> statement-breakpoint
UPDATE transform_merge_requests SET `target_branch` = 1 WHERE target_branch IS NULL;--> statement-breakpoint
-- UPDATE transform_merge_requests SET `source_branch` = 1 WHERE source_branch IS NULL;
--BEGIN TRANSACTION;
ALTER TABLE transform_merge_requests RENAME TO _transform_merge_requests_old;--> statement-breakpoint
CREATE TABLE `transform_merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`description` text DEFAULT '',
	`canon_id` integer DEFAULT -1 NOT NULL,
	`target_branch` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`target_branch`) REFERENCES `transform_branches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO transform_merge_requests SELECT * FROM _transform_merge_requests_old;--> statement-breakpoint
PRAGMA foreign_keys=on;
