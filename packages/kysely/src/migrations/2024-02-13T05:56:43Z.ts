import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema.dropView('pieces_view').ifExists().execute()

	await db.schema
		.createTable('pieces')
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('slug', 'text', (col) => col.notNull())
		.addColumn('type', 'text', (col) => col.notNull())
		.addColumn('title', 'text')
		.addColumn('summary', 'text')
		.addColumn('note', 'text')
		.addColumn('media', 'text')
		.addColumn('keywords', 'text')
		.addColumn('json_metadata', 'text')
		.addColumn('date_added', 'datetime')
		.addColumn('date_updated', 'datetime')
		.addColumn('date_consumed', 'datetime')
		.execute()

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "pieces_fts5" USING fts5(id UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'pieces', content_rowid="rowid")`.execute(
		db
	)

	await sql`CREATE TRIGGER IF NOT EXISTS books_after_insert 
AFTER INSERT ON books
FOR EACH ROW
BEGIN
INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) VALUES (new.id, new.slug, 'books', new.title, new.description, new.note, new.cover, new.keywords, json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'year_first_published', new.year_first_published, 'isbn', new.isbn), new.date_added, new.date_updated, new.date_read);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS books_after_update 
AFTER UPDATE OF slug, title, description, note, cover, keywords, subtitle, author, coauthors, year_first_published, isbn ON books
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.description, note = new.note, media = new.cover, keywords = new.keywords, json_metadata = json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'year_first_published', new.year_first_published, 'isbn', new.isbn), date_updated = new.date_updated WHERE id = new.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS books_after_delete
AFTER DELETE ON books 
FOR EACH ROW 
BEGIN 
DELETE FROM pieces WHERE id = old.id; 
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS links_after_insert 
AFTER INSERT ON links
FOR EACH ROW
BEGIN
INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) VALUES (new.id, new.slug, 'links', new.title, new.summary, new.note, new.representative_image, new.keywords, json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'url', new.url, 'type', new.type), new.date_added, new.date_updated, new.date_accessed);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS links_after_update 
AFTER UPDATE OF slug, title, summary, note, representative_image, keywords, subtitle, author, coauthors, url, type ON books
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.summary, note = new.note, media = new.representative_image, keywords = new.keywords, json_metadata = json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'url', new.url, 'type', new.type), date_updated = new.date_updated WHERE id = new.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS links_after_delete
AFTER DELETE ON links
FOR EACH ROW 
BEGIN 
DELETE FROM pieces WHERE id = old.id; 
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS pieces_after_insert 
AFTER INSERT ON pieces 
FOR EACH ROW 
BEGIN 
INSERT INTO pieces_fts5 (rowid, slug, title, type, summary, note, json_metadata, date_added, date_updated, date_consumed) VALUES (new.rowid, new.slug, new.title, new.type, new.summary, new.note, new.json_metadata, new.date_added, new.date_updated, new.date_consumed);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS pieces_after_update 
AFTER UPDATE ON pieces 
FOR EACH ROW 
BEGIN 
INSERT INTO pieces_fts5 (pieces_fts5, rowid, slug, title, type, summary, note, json_metadata, date_added, date_updated, date_consumed) VALUES ('delete', old.rowid, old.slug, old.title, old.type, old.summary, old.note, old.json_metadata, old.date_added, old.date_updated, old.date_consumed);
INSERT INTO pieces_fts5 (rowid, slug, title, type, summary, note, json_metadata, date_added, date_updated, date_consumed) VALUES (new.rowid, new.slug, new.title, new.type, new.summary, new.note, new.json_metadata, new.date_added, new.date_updated, new.date_consumed);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS pieces_after_delete 
AFTER DELETE ON pieces 
FOR EACH ROW 
BEGIN 
INSERT INTO pieces_fts5 (pieces_fts5, rowid, slug, title, type, summary, note, json_metadata, date_added, date_updated, date_consumed) VALUES ('delete', old.rowid, old.slug, old.title, old.type, old.summary, old.note, old.json_metadata, old.date_added, old.date_updated, old.date_consumed); 
END;`.execute(db)

	await sql`INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) SELECT id, slug, 'books', title, description, note, cover, keywords, json_object('subtitle', subtitle, 'author', author, 'coauthors', coauthors, 'year_first_published', year_first_published, 'isbn', isbn), date_added, date_updated, date_read FROM books`.execute(
		db
	)

	await sql`INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) SELECT id, slug, 'links', title, summary, note, representative_image, keywords, json_object('subtitle', subtitle, 'author', author, 'coauthors', coauthors, 'url', url, 'type', type), date_added, date_updated, date_accessed FROM links`.execute(
		db
	)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('pieces').execute()

	const booksQuery = db
		.selectFrom('books')
		.select('id')
		.select('note')
		.select('slug')
		.select('date_added')
		.select('date_updated')
		.select('title')
		.select('keywords')
		.select('cover as media')
		.select('date_read as date_order')
		.select(sql<string>`'books'`.as('from_piece'))

	const linksQuery = db
		.selectFrom('links')
		.select('id')
		.select('note')
		.select('slug')
		.select('date_added')
		.select('date_updated')
		.select('title')
		.select('keywords')
		.select('representative_image as media')
		.select('date_accessed as date_order')
		.select(sql<string>`'links'`.as('from_piece'))

	const unionedQuery = booksQuery.unionAll(linksQuery)

	// add view for all pieces
	await db.schema.createView('pieces_view').as(unionedQuery).execute()

	await sql`DROP TRIGGER IF EXISTS books_after_insert`.execute(db)
	await sql`DROP TRIGGER IF EXISTS books_after_update`.execute(db)
	await sql`DROP TRIGGER IF EXISTS books_after_delete`.execute(db)
	await sql`DROP TRIGGER IF EXISTS links_after_insert`.execute(db)
	await sql`DROP TRIGGER IF EXISTS links_after_update`.execute(db)
	await sql`DROP TRIGGER IF EXISTS links_after_delete`.execute(db)
}
