import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('links')
		.addColumn('is_paywall', 'boolean', (b) => b.defaultTo(0))
		.execute()
	await db.schema
		.alterTable('links')
		.addColumn('is_active', 'boolean', (b) => b.defaultTo(1))
		.execute()
	await db.schema.alterTable('books').addColumn('date_read', 'integer').execute()

	await db.schema.alterTable('links').dropColumn('active').execute()
	await db.schema.alterTable('books').dropColumn('month_read').execute()
	await db.schema.alterTable('books').dropColumn('year_read').execute()
	await db.schema.alterTable('books').dropColumn('read_order').execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.alterTable('links').dropColumn('is_paywall').execute()
	await db.schema.alterTable('links').dropColumn('is_active').execute()
	await db.schema.alterTable('books').dropColumn('date_read').execute()

	await db.schema
		.alterTable('links')
		.addColumn('active', 'boolean', (b) => b.defaultTo(1))
		.execute()
	await db.schema.alterTable('books').addColumn('month_read', 'integer').execute()
	await db.schema.alterTable('books').addColumn('year_read', 'integer').execute()
	await db.schema.alterTable('books').addColumn('read_order', 'varchar').execute()
}
