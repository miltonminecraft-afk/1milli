CREATE TABLE `scene_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`storage_key` text NOT NULL,
	`transform_json` text NOT NULL,
	`created_at` text NOT NULL
);
