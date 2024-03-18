CREATE TABLE `tenant_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`default_team` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`default_team`) REFERENCES `tenant_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_config_unique_idx` ON `tenant_config` (`default_team`);