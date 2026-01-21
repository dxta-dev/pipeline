PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_extract_repositories_to_members` (
	`repository_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`repository_id`, `member_id`),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `extract_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_extract_repositories_to_members`("repository_id", "member_id", "__created_at", "__updated_at") SELECT "repository_id", "member_id", "__created_at", "__updated_at" FROM `extract_repositories_to_members`;--> statement-breakpoint
DROP TABLE `extract_repositories_to_members`;--> statement-breakpoint
ALTER TABLE `__new_extract_repositories_to_members` RENAME TO `extract_repositories_to_members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_extract_repository_sha_trees` (
	`sha_id` integer NOT NULL,
	`parent_id` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`sha_id`, `parent_id`),
	FOREIGN KEY (`sha_id`) REFERENCES `extract_repository_shas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `extract_repository_shas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_extract_repository_sha_trees`("sha_id", "parent_id", "__created_at", "__updated_at") SELECT "sha_id", "parent_id", "__created_at", "__updated_at" FROM `extract_repository_sha_trees`;--> statement-breakpoint
DROP TABLE `extract_repository_sha_trees`;--> statement-breakpoint
ALTER TABLE `__new_extract_repository_sha_trees` RENAME TO `extract_repository_sha_trees`;