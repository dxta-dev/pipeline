DROP TABLE IF EXISTS `tenant_config`;
--> statement-breakpoint
CREATE TABLE `tenant_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`timezone_code` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);