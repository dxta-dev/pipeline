ALTER TABLE extract_merge_request_commits ADD `commit_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE transform_merge_request_events ADD `commit_url` text DEFAULT '' NOT NULL;