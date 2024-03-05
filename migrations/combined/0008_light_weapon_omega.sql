ALTER TABLE extract_merge_request_commits ADD `author_external_id` integer;--> statement-breakpoint
ALTER TABLE extract_merge_request_commits ADD `author_username` text;--> statement-breakpoint
ALTER TABLE extract_merge_request_commits ADD `committer_external_id` integer;--> statement-breakpoint
ALTER TABLE extract_merge_request_commits ADD `committer_username` text;