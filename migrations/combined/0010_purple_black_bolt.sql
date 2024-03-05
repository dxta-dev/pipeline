CREATE INDEX `merge_request_events_merge_request_idx` ON `transform_merge_request_events` (`merge_request`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_users_junk_idx` ON `transform_merge_request_metrics` (`users_junk`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_dates_junk_idx` ON `transform_merge_request_metrics` (`dates_junk`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_repository_idx` ON `transform_merge_request_metrics` (`repository`);--> statement-breakpoint
CREATE INDEX `merge_request_metrics_merge_request_idx` ON `transform_merge_request_metrics` (`merge_request`);