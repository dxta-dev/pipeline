ALTER TABLE `transform_merge_request_metrics` RENAME COLUMN `code_addition` TO `code_additions_old`;--> statement-breakpoint
ALTER TABLE `transform_merge_request_metrics` RENAME COLUMN `code_deletion` TO `code_deletions_old`;--> statement-breakpoint

ALTER TABLE `transform_merge_request_metrics` ADD COLUMN `code_addition` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transform_merge_request_metrics` ADD COLUMN `code_deletion` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

UPDATE `transform_merge_request_metrics` SET `code_addition` = `code_additions_old`, `code_deletion` = `code_deletions_old`;--> statement-breakpoint

ALTER TABLE `transform_merge_request_metrics` DROP COLUMN `code_additions_old`;--> statement-breakpoint
ALTER TABLE `transform_merge_request_metrics` DROP COLUMN `code_deletions_old`;--> statement-breakpoint

UPDATE `transform_merge_request_metrics` SET `code_addition` = 0 WHERE `code_addition` = -1;--> statement-breakpoint
UPDATE `transform_merge_request_metrics` SET `code_deletion` = 0 WHERE `code_deletion` = -1;--> statement-breakpoint
UPDATE `transform_merge_request_metrics` SET `mr_size` = 0 WHERE `mr_size` = -1;--> statement-breakpoint
