import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('pieces_manager')
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('date_added', 'datetime', (col) =>
			col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
		)
		.addColumn('date_updated', 'datetime')
		.addColumn('name', 'text', (col) => col.unique().notNull())
		.addColumn('schema', 'text', (col) => col.notNull())
		.execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('pieces_manager').execute()
}
