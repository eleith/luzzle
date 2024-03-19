import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('pieces_cache')
		.ifNotExists()
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('slug', 'text', (col) => col.notNull())
		.addColumn('type', 'text', (col) => col.notNull())
		.addColumn('content_hash', 'text')
		.addColumn('date_added', 'datetime', (col) =>
			col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
		)
		.addColumn('date_updated', 'datetime')
		.addUniqueConstraint('piece', ['slug', 'type'])
		.execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('cache').execute()
}
