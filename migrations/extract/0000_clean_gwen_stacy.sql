CREATE TABLE `members` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `merge_request_commits` (
	`id` integer PRIMARY KEY NOT NULL,
	`merge_request_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`created_at` text NOT NULL,
	`authored_date` text,
	`committed_date` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`committer_name` text,
	`committer_email` text,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `merge_request_diffs` (
	`id` integer PRIMARY KEY NOT NULL,
	`merge_request_id` integer NOT NULL,
	`new_path` text NOT NULL,
	`old_path` text NOT NULL,
	`a_mode` text NOT NULL,
	`b_mode` text NOT NULL,
	`new_file` integer NOT NULL,
	`renamed_file` integer NOT NULL,
	`deleted_file` integer NOT NULL,
	`diff` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`merge_request_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`merged_at` integer,
	`closed_at` integer,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `namespaces` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `repositories_to_members` (
	`repository_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(`member_id`, `repository_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_external_id_idx` ON `members` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_request_commits_external_id_idx` ON `merge_request_commits` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `diffs_merge_request_id_newPath_idx` ON `merge_request_diffs` (`merge_request_id`,`new_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_requests_external_id_idx` ON `merge_requests` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `namespaces_external_id_idx` ON `namespaces` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_idx` ON `repositories` (`external_id`);