CREATE TABLE `git_identities` (
	`id` integer PRIMARY KEY NOT NULL,
	`member_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repository_id_email_name_idx` ON `git_identities` (`repository_id`,`email`,`name`);