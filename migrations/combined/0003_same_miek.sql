CREATE TABLE `transform_deployments` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`deployment_type` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`status` integer,
	`deployed_at` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `transform_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deployed_at`) REFERENCES `transform_dates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `t_deployments_external_id_type_idx` ON `transform_deployments` (`external_id`,`repository_id`,`deployment_type`);