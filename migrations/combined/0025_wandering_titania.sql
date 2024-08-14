CREATE TABLE `extract_deployments` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`environment` text NOT NULL,
	`commit_id` integer NOT NULL,
	`status` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deployed_at` integer,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commit_id`) REFERENCES `extract_repository_commits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deployments_external_id_idx` ON `extract_deployments` (`external_id`,`repository_id`);