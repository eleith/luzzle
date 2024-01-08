import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	// rename screenshot_path to representative_image
	await db.schema
		.alterTable('links')
		.renameColumn('screenshot_path', 'representative_image')
		.execute()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema
		.alterTable('links')
		.renameColumn('representative_image', 'screenshot_path')
		.execute()
}
