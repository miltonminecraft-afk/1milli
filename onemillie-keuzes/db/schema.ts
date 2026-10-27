import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const selections=sqliteTable('asset_selections',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),
  selectionJson:text('selection_json').notNull(),notes:text('notes').notNull().default(''),
  revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()
});
