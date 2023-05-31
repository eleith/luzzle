import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('books')
    .addColumn('id', 'text', (col) => col.primaryKey().notNull())
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('subtitle', 'text')
    .addColumn('author', 'text', (col) => col.notNull())
    .addColumn('coauthors', 'text')
    .addColumn('description', 'text')
    .addColumn('keywords', 'text')
    .addColumn('note', 'text')
    .addColumn('pages', 'integer')
    .addColumn('year_first_published', 'integer')
    .addColumn('id_ol_book', 'text')
    .addColumn('id_ol_work', 'text')
    .addColumn('isbn', 'text')
    .addColumn('cover_path', 'text')
    .addColumn('cover_width', 'integer')
    .addColumn('cover_height', 'integer')
    .addColumn('year_read', 'integer')
    .addColumn('month_read', 'integer')
    .addColumn('read_order', 'text', (col) => col.notNull())
    .addColumn('date_added', 'datetime', (col) =>
      col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
    )
    .addColumn('date_updated', 'datetime')
    .execute()

  await db.schema
    .createTable('tags')
    .addColumn('id', 'text', (col) => col.primaryKey().notNull())
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('date_added', 'datetime', (col) =>
      col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
    )
    .addColumn('date_updated', 'datetime')
    .execute()

  await db.schema
    .createTable('tag_maps')
    .addColumn('id_tag', 'text', (col) => col.notNull())
    .addColumn('id_item', 'text', (col) => col.notNull())
    .addColumn('type', 'text', (col) => col.notNull())
    .addColumn('date_added', 'datetime', (col) =>
      col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
    )
    .addColumn('date_updated', 'datetime')
    .execute()
}

export async function down(): Promise<void> {
  // nothing to do
}
