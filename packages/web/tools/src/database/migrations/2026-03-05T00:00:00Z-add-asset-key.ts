import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await sql`ALTER TABLE web_pieces_assets ADD COLUMN asset_key TEXT NOT NULL DEFAULT ''`.execute(db)

	await sql`CREATE TABLE web_pieces_assets_new (
		piece_file_path TEXT NOT NULL,
		piece_key TEXT NOT NULL,
		piece_asset_path TEXT DEFAULT NULL,
		transformation TEXT NOT NULL,
		asset_path TEXT,
		piece_field_path TEXT,
		asset_key TEXT NOT NULL DEFAULT '',
		mime_type TEXT NOT NULL,
		is_embedded BOOLEAN DEFAULT 0,
		content TEXT,
		PRIMARY KEY (piece_file_path, transformation, piece_asset_path)
	)`.execute(db)

	await sql`INSERT INTO web_pieces_assets_new
		SELECT piece_file_path, piece_key, piece_asset_path, transformation, asset_path, piece_field_path, asset_key, mime_type, is_embedded, content
		FROM web_pieces_assets`.execute(db)

	await sql`DROP TRIGGER IF EXISTS web_pieces_after_delete`.execute(db)

	await sql`DROP TABLE web_pieces_assets`.execute(db)
	await sql`ALTER TABLE web_pieces_assets_new RENAME TO web_pieces_assets`.execute(db)

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
	await sql`CREATE TABLE web_pieces_assets_old (
		piece_file_path TEXT NOT NULL,
		piece_key TEXT NOT NULL,
		piece_asset_path TEXT DEFAULT NULL,
		transformation TEXT NOT NULL,
		asset_path TEXT NOT NULL,
		piece_field_path TEXT,
		mime_type TEXT NOT NULL,
		is_embedded BOOLEAN DEFAULT 0,
		content TEXT,
		PRIMARY KEY (piece_file_path, transformation, piece_asset_path)
	)`.execute(db)

	await sql`INSERT INTO web_pieces_assets_old
		SELECT piece_file_path, piece_key, piece_asset_path, transformation, COALESCE(asset_path, ''), piece_field_path, mime_type, is_embedded, content
		FROM web_pieces_assets`.execute(db)

	await sql`DROP TRIGGER IF EXISTS web_pieces_after_delete`.execute(db)

	await sql`DROP TABLE web_pieces_assets`.execute(db)
	await sql`ALTER TABLE web_pieces_assets_old RENAME TO web_pieces_assets`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_delete AFTER DELETE ON web_pieces
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata)
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);

		DELETE FROM web_pieces_tags WHERE piece_id = old.id;
		DELETE FROM web_pieces_assets WHERE piece_file_path = old.file_path;
	END;`.execute(db)
}
