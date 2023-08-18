ALTER TABLE merge_requests ADD `author_external_id` integer;--> statement-breakpoint
ALTER TABLE merge_requests ADD `state` text;--> statement-breakpoint
ALTER TABLE merge_requests ADD `target_branch` text;--> statement-breakpoint
ALTER TABLE merge_requests ADD `source_branch` text;