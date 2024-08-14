CREATE TABLE `tenant_deployment_environments` (
	`id` integer PRIMARY KEY NOT NULL,
	`repository_external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`environment` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
