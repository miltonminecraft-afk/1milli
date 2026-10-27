CREATE TABLE `asset_selections` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`selection_json` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
