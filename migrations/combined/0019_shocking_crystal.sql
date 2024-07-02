CREATE TABLE `extract_deployments` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`name` text,
	`url` text,
	`sha` text,
	`ref` text,
	`is_prod_mark` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deployments_external_id_idx` ON `extract_deployments` (`external_id`,`repository_id`);