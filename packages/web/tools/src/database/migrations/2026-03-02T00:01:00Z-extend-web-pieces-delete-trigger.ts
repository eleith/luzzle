import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await sql`DROP TRIGGER IF EXISTS web_pieces_after_delete`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_delete AFTER DELETE ON web_pieces
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata)
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);

		DELETE FROM web_pieces_tags WHERE piece_id = old.id;
		DELETE FROM web_pieces_assets WHERE piece_file_path = old.file_path;
	END;`.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await sql`DROP TRIGGER IF EXISTS web_pieces_after_delete`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_delete AFTER DELETE ON web_pieces
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata)
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);
	END;`.execute(db)
}
