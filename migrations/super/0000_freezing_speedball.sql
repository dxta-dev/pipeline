CREATE TABLE `tenant_source_control` (
	`id` integer PRIMARY KEY NOT NULL,
	`tenant_id` integer NOT NULL,
	`provider` text NOT NULL,
	`github_installation_id` integer,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_source_control_tenant_provider_idx` ON `tenant_source_control` (`tenant_id`,`provider`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY NOT NULL,
	`subdomain` text NOT NULL,
	`db_url` text NOT NULL,
	`crawl_user_id` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
