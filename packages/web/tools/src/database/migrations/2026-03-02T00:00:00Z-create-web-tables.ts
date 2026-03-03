import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('web_pieces_assets')
		.ifNotExists()
		.addColumn('piece_file_path', 'text', (col) => col.notNull())
		.addColumn('piece_key', 'text', (col) => col.notNull())
		.addColumn('piece_asset_path', 'text', (col) => col.defaultTo(null))
		.addColumn('transformation', 'text', (col) => col.notNull())
		.addColumn('asset_path', 'text', (col) => col.notNull())
		.addColumn('piece_field_path', 'text')
		.addColumn('mime_type', 'text', (col) => col.notNull())
		.addColumn('is_embedded', 'boolean', (col) => col.defaultTo(0))
		.addColumn('content', 'text')
		.addPrimaryKeyConstraint('web_pieces_assets_pk', [
			'piece_file_path',
			'transformation',
			'piece_asset_path',
		])
		.execute()

	await db.schema
		.createTable('web_pieces_tags')
		.ifNotExists()
		.addColumn('piece_type', 'text', (col) => col.notNull())
		.addColumn('piece_slug', 'text', (col) => col.notNull())
		.addColumn('piece_id', 'text', (col) => col.notNull())
		.addColumn('tag', 'text', (col) => col.notNull())
		.addColumn('slug', 'text', (col) => col.notNull())
		.execute()

	await db.schema
		.createTable('web_pieces')
		.ifNotExists()
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('key', 'text', (col) => col.notNull())
		.addColumn('slug', 'text', (col) => col.notNull())
		.addColumn('type', 'text', (col) => col.notNull())
		.addColumn('file_path', 'text', (col) => col.notNull())
		.addColumn('title', 'text')
		.addColumn('summary', 'text')
		.addColumn('note', 'text')
		.addColumn('keywords', 'text')
		.addColumn('json_metadata', 'text')
		.addColumn('date_added', 'datetime')
		.addColumn('date_updated', 'datetime')
		.addColumn('date_consumed', 'datetime')
		.addUniqueConstraint('slug-type', ['slug', 'type'])
		.execute()

	await sql`CREATE INDEX IF NOT EXISTS web_pieces_date_consumed_date_added_index ON web_pieces (date_consumed DESC, date_added DESC)`.execute(
		db
	)

	await sql`CREATE INDEX IF NOT EXISTS web_pieces_type_date_consumed_date_added_index ON web_pieces (type, date_consumed DESC, date_added DESC)`.execute(
		db
	)

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, key UNINDEXED, slug, type UNINDEXED, title, summary, note, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, file_path UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)

	await sql`CREATE TRIGGER IF NOT EXISTS web_pieces_after_insert AFTER INSERT ON web_pieces		BEGIN
		INSERT INTO web_pieces_fts5(rowid, key, slug, type, title, summary, note, keywords, json_metadata, date_added, date_updated, date_consumed)
		VALUES(new.rowid, new.key, new.slug, new.type, new.title, new.summary, new.note, new.keywords, new.json_metadata, new.date_added, new.date_updated, new.date_consumed);
	END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS web_pieces_after_delete AFTER DELETE ON web_pieces
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata)
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);
	END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS web_pieces_after_update AFTER UPDATE ON web_pieces
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata)
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);

		INSERT INTO web_pieces_fts5(rowid, key, slug, title, summary, note, keywords, json_metadata)
		VALUES (new.rowid, new.key, new.slug, new.title, new.summary, new.note, new.keywords, new.json_metadata);
	END;`.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('web_pieces_assets').ifExists().execute()
	await db.schema.dropTable('web_pieces_tags').ifExists().execute()
	await db.schema.dropTable('web_pieces').ifExists().execute()
	await db.schema.dropTable('web_pieces_fts5').ifExists().execute()
}
