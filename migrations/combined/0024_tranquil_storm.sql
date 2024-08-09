CREATE TABLE `extract_repository_commits` (
	`id` integer PRIMARY KEY NOT NULL,
	`repository_id` integer NOT NULL,
	`sha_0` integer NOT NULL,
	`sha_1` integer NOT NULL,
	`sha_2` integer NOT NULL,
	`sha_3` integer NOT NULL,
	`sha_4` integer NOT NULL,
	`committed_at` integer,
	`authored_at` integer,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`repository_id`) REFERENCES `extract_repositories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extract_repository_commits_children` (
	`commit` integer NOT NULL,
	`parent` integer NOT NULL,
	`__created_at` integer DEFAULT (strftime('%s', 'now')),
	`__updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`commit`, `parent`),
	FOREIGN KEY (`commit`) REFERENCES `extract_repository_commits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent`) REFERENCES `extract_repository_commits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repository_commits_repository_sha_idx` ON `extract_repository_commits` (`repository_id`,`sha_0`,`sha_1`,`sha_2`,`sha_3`,`sha_4`);