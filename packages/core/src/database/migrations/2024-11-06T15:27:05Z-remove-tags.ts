import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('tags').execute()
	await db.schema.dropTable('tag_maps').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
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
