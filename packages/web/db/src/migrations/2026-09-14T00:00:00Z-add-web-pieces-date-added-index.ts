import type { Kysely} from 'kysely';
import { sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await sql`CREATE INDEX IF NOT EXISTS web_pieces_date_added_index ON web_pieces (date_added DESC)`.execute(
		db
	)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await sql`DROP INDEX IF EXISTS web_pieces_date_added_index`.execute(db)
}
