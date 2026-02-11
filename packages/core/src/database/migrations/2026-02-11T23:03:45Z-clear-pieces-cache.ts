import { Kysely } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.deleteFrom('pieces_items').execute()
}

export async function down(): Promise<void> {
	// nothing to do
}
