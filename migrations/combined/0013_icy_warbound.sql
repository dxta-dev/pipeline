CREATE TABLE `transform_branches` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
ALTER TABLE transform_merge_requests ADD `target_branch` integer NOT NULL REFERENCES transform_branches(id);--> statement-breakpoint
ALTER TABLE transform_merge_requests ADD `source_branch` integer NOT NULL REFERENCES transform_branches(id);--> statement-breakpoint
ALTER TABLE transform_null_rows ADD `branch_id` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `branches_name_idx` ON `transform_branches` (`name`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/