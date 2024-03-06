CREATE TABLE `tenant_team_members` (
	`id` integer PRIMARY KEY NOT NULL,
	`team` integer NOT NULL,
	`member` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`team`) REFERENCES `tenant_teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenant_teams` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_unique_idx` ON `tenant_team_members` (`team`,`member`);