import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('texts')
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('slug', 'text', (col) => col.notNull().unique())
		.addColumn('title', 'text', (col) => col.notNull())
		.addColumn('subtitle', 'text')
		.addColumn('summary', 'text')
		.addColumn('keywords', 'text')
		.addColumn('note', 'text')
		.addColumn('date_published', 'datetime')
		.addColumn('representative_image', 'text')
		.addColumn('attachments', 'text')
		.addColumn('date_added', 'datetime', (col) =>
			col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
		)
		.addColumn('date_updated', 'datetime')
		.execute()

	await sql`CREATE TRIGGER IF NOT EXISTS texts_after_insert 
AFTER INSERT ON texts
FOR EACH ROW
BEGIN
INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) VALUES (new.id, new.slug, 'texts', new.title, new.summary, new.note, new.representative_image, new.keywords, json_object('subtitle', new.subtitle, 'attachments', new.attachments), new.date_added, new.date_updated, new.date_published);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS texts_after_update 
AFTER UPDATE OF slug, title, summary, note, representative_image, keywords, subtitle, attachments, date_published ON texts
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.summary, note = new.note, media = new.representative_image, keywords = new.keywords, json_metadata = json_object('subtitle', new.subtitle, 'attachments', new.attachments), date_updated = new.date_updated, date_published = new.date_published WHERE id = new.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS texts_after_delete
AFTER DELETE ON books 
FOR EACH ROW 
BEGIN 
DELETE FROM pieces WHERE id = old.id;
END;`.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('texts').execute()
}
