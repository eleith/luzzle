import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await sql`DROP TRIGGER IF EXISTS texts_after_update`.execute(db)
	await sql`DROP TRIGGER IF EXISTS books_after_update`.execute(db)
	await sql`DROP TRIGGER IF EXISTS links_after_update`.execute(db)
	await sql`DROP TRIGGER IF EXISTS links_after_insert`.execute(db)
	await sql`DROP TRIGGER IF EXISTS text_after_delete`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS texts_after_update 
AFTER UPDATE ON texts
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.summary, note = new.note, media = new.representative_image, keywords = new.keywords, json_metadata = json_object('subtitle', new.subtitle, 'attachments', new.attachments), date_updated = new.date_updated, date_consumed = new.date_published WHERE id = old.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS books_after_update 
AFTER UPDATE ON books
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.description, note = new.note, media = new.cover, keywords = new.keywords, json_metadata = json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'year_first_published', new.year_first_published, 'isbn', new.isbn), date_consumed = new.date_read, date_updated = new.date_updated WHERE id = old.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS links_after_update 
AFTER UPDATE ON links
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.summary, note = new.note, media = new.representative_image, keywords = new.keywords, json_metadata = json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'url', new.url, 'type', new.type, 'date_published', new.date_published), date_consumed = new.date_accessed, date_updated = new.date_updated WHERE id = old.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS links_after_insert 
AFTER INSERT ON links
FOR EACH ROW
BEGIN
INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) VALUES (new.id, new.slug, 'links', new.title, new.summary, new.note, new.representative_image, new.keywords, json_object('subtitle', new.subtitle, 'author', new.author, 'coauthors', new.coauthors, 'url', new.url, 'type', new.type, 'date_published', new.date_published), new.date_added, new.date_updated, new.date_accessed);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS texts_after_delete
AFTER DELETE ON texts
FOR EACH ROW 
BEGIN 
DELETE FROM pieces WHERE id = old.id;
END;`.execute(db)
}

export async function down(): Promise<void> {
	//
}
