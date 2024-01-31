CREATE INDEX `dates_week_idx` ON `transform_dates` (`week`);--> statement-breakpoint
CREATE INDEX `merge_request_events_occured_on_idx` ON `transform_merge_request_events` (`occured_on`);