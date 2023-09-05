CREATE TABLE `dates` (
	`id` integer PRIMARY KEY NOT NULL,
	`day` integer
);
--> statement-breakpoint
CREATE TABLE `forge_users` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` text NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `merge_request_reports` (
	`id` integer PRIMARY KEY NOT NULL,
	`forge_user_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`merge_request_id` integer NOT NULL,
	`date_id` integer NOT NULL,
	`coding_duration` integer NOT NULL,
	`review_start_delay` integer NOT NULL,
	`review_duration` integer NOT NULL,
	`lines_changed` integer NOT NULL,
	`reviewed` integer DEFAULT false,
	`approved` integer DEFAULT false,
	`review_depth` integer NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`forge_user_id`) REFERENCES `forge_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`merge_request_id`) REFERENCES `merge_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`date_id`) REFERENCES `dates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` text NOT NULL,
	`title` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` text NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dates_day_week_month_year_idx` ON `dates` (`day`,`day`,`day`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `forge_users_external_id_forge_type_idx` ON `forge_users` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_requests_external_id_forge_type_idx` ON `merge_requests` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_forge_type_idx` ON `repositories` (`external_id`,`forge_type`);