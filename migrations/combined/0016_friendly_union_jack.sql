ALTER TABLE crawl_instances ADD `since` integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE crawl_instances ADD `until` integer DEFAULT -1 NOT NULL;