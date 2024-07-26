/*
 SQLite does not support "Dropping foreign key" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/

DROP TABLE IF EXISTS `tenant_config`;--> statement-breakpoint
CREATE TABLE `tenant_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`hq_timezone` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_config_unique_idx` ON `tenant_config` (`hq_timezone`);