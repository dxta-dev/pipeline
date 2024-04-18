ALTER TABLE extract_merge_request_commits ADD `html_url` text;--> statement-breakpoint
ALTER TABLE extract_merge_request_notes ADD `html_url` text;--> statement-breakpoint
ALTER TABLE extract_timeline_events ADD `html_url` text;--> statement-breakpoint
ALTER TABLE transform_merge_request_events ADD `html_url` text DEFAULT '' NOT NULL;