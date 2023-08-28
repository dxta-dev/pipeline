CREATE TABLE `merge_request_notes` (
	`id` integer PRIMARY KEY NOT NULL,
	`external_id` integer NOT NULL,
	`merge_request_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`author_username` integer NOT NULL,
	`author_external_id` integer NOT NULL,
	`__created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`__updated_at` integer DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merge_request_notes_external_id_idx` ON `merge_request_notes` (`external_id`);