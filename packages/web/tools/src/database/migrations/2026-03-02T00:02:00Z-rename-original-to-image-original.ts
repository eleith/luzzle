import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await sql`UPDATE web_pieces_assets SET transformation = 'image.original' WHERE transformation = 'original'`.execute(
		db
	)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await sql`UPDATE web_pieces_assets SET transformation = 'original' WHERE transformation = 'image.original'`.execute(
		db
	)
}
