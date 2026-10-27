import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const collectionSettings = sqliteTable("collection_settings", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  orderJson: text("order_json").notNull(),
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const sceneObjects = sqliteTable("scene_objects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  storageKey: text("storage_key").notNull(),
  transformJson: text("transform_json").notNull(),
  createdAt: text("created_at").notNull(),
});
