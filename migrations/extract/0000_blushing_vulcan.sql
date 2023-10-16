CREATE TABLE `git_identities` (
	`id` integer PRIMARY KEY NOT NULL,
	`repository_id` integer NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text,
	`username` text NOT NULL,
	`email` text,
	`extracted_source` integer,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `merge_request_commits` (
	`id` integer PRIMARY KEY NOT NULL,
	`merge_request_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`authored_date` integer NOT NULL,
	`committed_date` integer NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`committer_name` text,
	`committer_email` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
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
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `merge_request_notes` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`merge_request_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`author_username` text NOT NULL,
	`author_external_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `merge_requests` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`canon_id` integer NOT NULL,
	`repository_id` integer NOT NULL,
	`title` text NOT NULL,
	`web_url` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`merged_at` integer,
	`closed_at` integer,
	`author_external_id` integer,
	`state` text,
	`target_branch` text,
	`source_branch` text,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `namespaces` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`forge_type` integer NOT NULL,
	`name` text NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `repositories_to_members` (
	`repository_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`member_id`, `repository_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repository_id_email_name_idx` ON `git_identities` (`repository_id`,`email`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_external_id_idx` ON `members` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_request_commits_external_id_idx` ON `merge_request_commits` (`merge_request_id`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `diffs_merge_request_id_newPath_idx` ON `merge_request_diffs` (`merge_request_id`,`new_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_request_notes_external_id_idx` ON `merge_request_notes` (`merge_request_id`,`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `merge_requests_external_id_idx` ON `merge_requests` (`external_id`,`repository_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `namespaces_external_id_idx` ON `namespaces` (`external_id`,`forge_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_idx` ON `repositories` (`external_id`,`forge_type`);