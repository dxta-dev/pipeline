CREATE TABLE `extract_cicd_runs` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`workflow_external_id` integer NOT NULL,
	`workflow_runner` integer,
	`run_attempt` integer NOT NULL,
	`details_url` text,
	`git_sha` text NOT NULL,
	`git_branch` text NOT NULL,
	`status` integer,
	`result` integer,
	`run_started_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_cicd_workflows` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`runner` integer NOT NULL,
	`name` text NOT NULL,
	`source_path` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenant_cicd_deploy_workflows` (
	`id` integer PRIMARY KEY NOT NULL,
	`workflow_external_id` integer NOT NULL,
	`repository_external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`branch` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cicd_runs_external_id_idx` ON `extract_cicd_runs` (`external_id`,`workflow_runner`,`repository_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cicd_workflows_external_id_idx` ON `extract_cicd_workflows` (`external_id`,`runner`,`repository_id`);