CREATE TABLE `company_info` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo_url` text NOT NULL,
	`screenshot_url` text NOT NULL,
	`description` text NOT NULL,
	`tenant_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
