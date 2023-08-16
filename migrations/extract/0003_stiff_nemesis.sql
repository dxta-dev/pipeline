/*
 SQLite does not support "Changing existing column type" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
/*
 SQLite does not support "Set default to column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
/*
 SQLite does not support "Drop not null from column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE members ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE members ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE merge_request_commits ADD `merge_request_created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE merge_request_commits ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE merge_request_diffs ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE merge_request_diffs ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE merge_requests ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE merge_requests ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE namespaces ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE namespaces ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE repositories ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE repositories ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE repositories_to_members ADD `created_at` integer DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE repositories_to_members ADD `updated_at` integer DEFAULT CURRENT_TIMESTAMP;
