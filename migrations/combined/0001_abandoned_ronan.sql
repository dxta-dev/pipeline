DROP INDEX IF EXISTS `tenant_config_unique_idx`;--> statement-breakpoint
ALTER TABLE tenant_config ADD `tzdata` text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenant_config` DROP COLUMN `hq_timezone`;