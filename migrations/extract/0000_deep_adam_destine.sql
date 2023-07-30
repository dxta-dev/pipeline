CREATE TABLE `namespaces` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repositories` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `namespaces_external_id_idx` ON `namespaces` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `repositories_external_id_idx` ON `repositories` (`external_id`);