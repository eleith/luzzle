import { Kysely, sql } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable('games')
		.addColumn('id', 'text', (col) => col.primaryKey().notNull())
		.addColumn('slug', 'text', (col) => col.notNull().unique())
		.addColumn('title', 'text', (col) => col.notNull())
		.addColumn('type', 'text', (col) =>
			col
				.notNull()
				.defaultTo('board')
				.check(sql`type IN ('video', 'board')`)
		)
		.addColumn('url', 'text')
		.addColumn('publisher', 'text')
		.addColumn('developer', 'text')
		.addColumn('keywords', 'text')
		.addColumn('description', 'text')
		.addColumn('play_time', 'integer')
		.addColumn('number_of_players', 'integer')
		.addColumn('date_published', 'datetime')
		.addColumn('note', 'text')
		.addColumn('representative_image', 'text')
		.addColumn('date_added', 'datetime', (col) =>
			col.defaultTo(sql`((julianday('now') - 2440587.5)*86400000)`).notNull()
		)
		.addColumn('date_updated', 'datetime')
		.addColumn('date_played', 'datetime')
		.addColumn('played_on', 'text', (col) =>
			col
				.notNull()
				.defaultTo('irl')
				.check(
					sql`played_on IN ('xbox 360', 'switch', 'android', 'nes', 'snes', 'gamecube', 'wii', 'gameboy', 'gameboy advance sp', 'ds', 'steam', 'n64', 'pc', 'playstation 5', 'irl', 'web', 'stadia')`
				)
		)
		.execute()

	await sql`CREATE TRIGGER IF NOT EXISTS games_after_insert 
AFTER INSERT ON games
FOR EACH ROW
BEGIN
INSERT INTO pieces (id, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) VALUES (new.id, new.slug, 'games', new.title, new.description, new.note, new.representative_image, new.keywords, json_object('url', new.url, 'publisher', new.publisher, 'developer', new.developer, 'play_time', new.play_time, 'number_of_players', new.number_of_players, 'played_on', new.played_on, 'date_published', new.date_published), new.date_added, new.date_updated, new.date_played);
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS games_after_update 
AFTER UPDATE OF slug, title, description, note, representative_image, keywords, url, publisher, developer, play_time, number_of_players, played_on, date_played, date_published ON games
FOR EACH ROW
BEGIN
UPDATE pieces SET slug = new.slug, title = new.title, summary = new.description, note = new.note, media = new.representative_image, keywords = new.keywords, json_metadata = json_object('url', new.url, 'publisher', new.publisher, 'developer', new.developer, 'play_time', new.play_time, 'number_of_players', new.number_of_players, 'played_on', new.played_on, 'date_published', new.date_published), date_updated = new.date_updated, date_published = new.date_published, date_consumed = new.date_played WHERE id = new.id;
END;`.execute(db)

	await sql`CREATE TRIGGER IF NOT EXISTS games_after_delete
AFTER DELETE ON games
FOR EACH ROW 
BEGIN 
DELETE FROM pieces WHERE id = old.id;
END;`.execute(db)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable('games').execute()
}
