#! /usr/bin/env node

import { LuzzleDatabase, getDatabaseClient, sql } from '@luzzle/core'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'

async function createWebTables(db: LuzzleDatabase): Promise<void> {
	await db.schema
		.createTable('web_pieces')
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

	await sql`INSERT INTO web_pieces (id, slug, type, title, summary, note, media, keywords, date_added, date_updated, date_consumed, json_metadata) SELECT id as id, slug as slug, 'books' as type, title as title, description as summary, note as note, cover as media, keywords as keywords, date_added as date_added, date_updated as date_updated, date_read as date_consumed, json_object('url', url, 'isbn', isbn, 'year_first_published', year_first_published, 'subtitle', subtitle, 'author', author, 'coauthors', coauthors, 'pages', pages) as json_metadata FROM pieces_items_books`.execute(
		db
	)

	await sql`INSERT INTO web_pieces (id, slug, type, title, summary, note, media, keywords, date_added, date_updated, date_consumed, json_metadata) SELECT id as id, slug as slug, 'games' as type, title as title, description as summary, note as note, representative_image as media, keywords as keywords, date_added as date_added, date_updated as date_updated, date_played as date_consumed, json_object('url', url, 'publisher', publisher, 'date_published', date_published, 'play_time', play_time, 'played_on', played_on, 'play_time', play_time, 'number_of_players', number_of_players, 'type', type) as json_metadata FROM pieces_items_games`.execute(
		db
	)

	await sql`INSERT INTO web_pieces (id, slug, type, title, summary, note, media, keywords, date_added, date_updated, date_consumed, json_metadata) SELECT id as id, slug as slug, 'links' as type, title as title, summary as summary, note as note, representative_image as media, keywords as keywords, date_added as date_added, date_updated as date_updated, date_accessed as date_consumed, json_object('url', url, 'is_active', is_active, 'is_paywall', is_paywall, 'type', type, 'author', author, 'subtitle', subtitle, 'coauthors', coauthors, 'archive_path', archive_path, 'word_count', word_count) as json_metadata FROM pieces_items_links`.execute(
		db
	)

	await sql`INSERT INTO web_pieces (id, slug, type, title, summary, note, media, keywords, date_added, date_updated, date_consumed, json_metadata) SELECT id as id, slug as slug, 'texts' as type, title as title, summary as summary, note as note, representative_image as media, keywords as keywords, date_added as date_added, date_updated as date_updated, date_published as date_consumed, json_object('subtitle', subtitle, 'attachments', attachments) as json_metadata FROM pieces_items_texts`.execute(
		db
	)

	await sql`INSERT INTO web_pieces (id, slug, type, title, summary, note, media, keywords, date_added, date_updated, date_consumed, json_metadata) SELECT id as id, slug as slug, 'films' as type, title as title, summary as summary, note as note, poster as media, keywords as keywords, date_added as date_added, date_updated as date_updated, date_viewed as date_consumed, json_object('subtitle', subtitle, 'language', language, 'runtime', runtime, 'date_released', date_released, 'backdrop', backdrop, 'homepage', homepage, 'url', url, 'type', type, 'people', people) as json_metadata FROM pieces_items_films`.execute(
		db
	)

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)

	await sql`INSERT INTO web_pieces_fts5(web_pieces_fts5) VALUES('rebuild')`.execute(db)
}

async function dropWebTables(db: LuzzleDatabase): Promise<void> {
	await db.schema.dropTable('web_pieces').ifExists().execute()
	await db.schema.dropTable('web_pieces_fts5').ifExists().execute()
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const db = getDatabaseClient(command.database)

		if (command.clean) {
			await dropWebTables(db)
		} else {
			await createWebTables(db)
		}
	} catch (err) {
		console.error(err)
	}
}

run()
