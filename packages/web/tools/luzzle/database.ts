import { type LuzzleDatabase, getDatabaseClient, sql, LuzzleTables } from '@luzzle/core'
import { WebPieceTags, type WebPieces } from '../../src/lib/pieces/types'
import slugify from '@sindresorhus/slugify'
import { Kysely } from 'kysely'

type WebLuzzleDatabase = Kysely<LuzzleTables & {
	web_pieces: WebPieces
	web_pieces_fts5: WebPieces
	web_pieces_tags: WebPieceTags
}>

function batchArray<T>(array: T[], batchSize: number): T[][] {
	const batches: T[][] = []
	for (let i = 0; i < array.length; i += batchSize) {
		batches.push(array.slice(i, i + batchSize))
	}
	return batches
}

async function createWebTables(db: LuzzleDatabase): Promise<void> {
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
}

async function populateWebPieceTables(db: LuzzleDatabase): Promise<void> {
	const tables = await db.introspection.getTables()
	const webColumns = [
		'id',
		'slug',
		'title',
		'type',
		'summary',
		'note',
		'media',
		'keywords',
		'date_added',
		'date_updated',
		'date_consumed',
		'json_metadata'
	] as Array<keyof WebPieces>

	const bookTable = 'pieces_items_books'
	const books = tables.find((table) => table.name === bookTable)
	const bookColumns = books?.columns.map((column) => column.name) || []
	const bookColumnsJsonInsert = bookColumns.map((column) => `'${column}', ${column}`).join(', ')
	const bookColumnsWebInsert = [
		'id',
		'slug',
		'title',
		"'books'",
		'description',
		'note',
		'cover',
		'keywords',
		'date_added',
		'date_updated',
		'date_read',
		'json_object(' + bookColumnsJsonInsert + ')'
	].join(', ')

	const gameTable = 'pieces_items_games'
	const games = tables.find((table) => table.name === gameTable)
	const gameColumns = games?.columns.map((column) => column.name) || []
	const gameColumnsJsonInsert = gameColumns.map((column) => `'${column}', ${column}`).join(', ')
	const gameColumnsWebInsert = [
		'id',
		'slug',
		'title',
		"'games'",
		'description',
		'note',
		'representative_image',
		'keywords',
		'date_added',
		'date_updated',
		'date_played',
		'json_object(' + gameColumnsJsonInsert + ')'
	].join(', ')

	const linkTable = 'pieces_items_links'
	const links = tables.find((table) => table.name === linkTable)
	const linkColumns = links?.columns.map((column) => column.name) || []
	const linkColumnsJsonInsert = linkColumns.map((column) => `'${column}', ${column}`).join(', ')
	const linkColumnsWebInsert = [
		'id',
		'slug',
		'title',
		"'links'",
		'summary',
		'note',
		'representative_image',
		'keywords',
		'date_added',
		'date_updated',
		'date_accessed',
		'json_object(' + linkColumnsJsonInsert + ')'
	].join(', ')

	const textTable = 'pieces_items_texts'
	const texts = tables.find((table) => table.name === textTable)
	const textColumns = texts?.columns.map((column) => column.name) || []
	const textColumnsJsonInsert = textColumns.map((column) => `'${column}', ${column}`).join(', ')
	const textColumnsWebInsert = [
		'id',
		'slug',
		'title',
		"'texts'",
		'summary',
		'note',
		'representative_image',
		'keywords',
		'date_added',
		'date_updated',
		'date_published',
		'json_object(' + textColumnsJsonInsert + ')'
	].join(', ')

	const filmTable = 'pieces_items_films'
	const films = tables.find((table) => table.name === filmTable)
	const filmColumns = films?.columns.map((column) => column.name) || []
	const filmColumnsJsonInsert = filmColumns.map((column) => `'${column}', ${column}`).join(', ')
	const filmColumnsWebInsert = [
		'id',
		'slug',
		'title',
		"'films'",
		'summary',
		'note',
		'poster',
		'keywords',
		'date_added',
		'date_updated',
		'date_viewed',
		'json_object(' + filmColumnsJsonInsert + ')'
	].join(', ')

	await sql`INSERT INTO web_pieces (${sql.raw(webColumns.join(', '))}) SELECT ${sql.raw(
		bookColumnsWebInsert
	)} FROM ${sql.raw(bookTable)}`.execute(db)
	await sql`INSERT INTO web_pieces (${sql.raw(webColumns.join(', '))}) SELECT ${sql.raw(
		gameColumnsWebInsert
	)} FROM ${sql.raw(gameTable)}`.execute(db)
	await sql`INSERT INTO web_pieces (${sql.raw(webColumns.join(', '))}) SELECT ${sql.raw(
		linkColumnsWebInsert
	)} FROM ${sql.raw(linkTable)}`.execute(db)
	await sql`INSERT INTO web_pieces (${sql.raw(webColumns.join(', '))}) SELECT ${sql.raw(
		textColumnsWebInsert
	)} FROM ${sql.raw(textTable)}`.execute(db)
	await sql`INSERT INTO web_pieces (${sql.raw(webColumns.join(', '))}) SELECT ${sql.raw(
		filmColumnsWebInsert
	)} FROM ${sql.raw(filmTable)}`.execute(db)

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)
	await sql`INSERT INTO web_pieces_fts5(web_pieces_fts5) VALUES('rebuild')`.execute(db)
}

async function populateWebPieceTagsTable(db: WebLuzzleDatabase): Promise<void> {
	const tags = await sql<{
		slug: string
		type: WebPieces['type']
		tag: string
		id: string
	}>`SELECT web_pieces.slug, web_pieces.id, web_pieces.type, json_each.value as tag FROM web_pieces, json_each(web_pieces.keywords)`.execute(
		db
	)

	const values: Array<WebPieceTags> = []

	tags.rows.forEach((tag) => {
		if (tag) {
			values.push({
				piece_slug: tag.slug,
				piece_type: tag.type,
				tag: tag.tag,
				slug: slugify(tag.tag),
				piece_id: tag.id
			})
		}
	})

	if (values.length) {
		const batches = batchArray(values, 1000)
		for (const batch of batches) {
			await db.insertInto('web_pieces_tags').values(batch).execute()
		}
	}

}

export async function initialize(databasePath: string) {
	const db = getDatabaseClient(databasePath)
	const webDb = db.withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
		web_pieces_tags: WebPieceTags
	}>()

	await webDb.schema.dropTable('web_pieces_fts5').ifExists().execute()
	await webDb.schema.dropTable('web_pieces').ifExists().execute()
	await webDb.schema.dropTable('web_pieces_tags').ifExists().execute()

	await createWebTables(db)
	await populateWebPieceTables(db)
	await populateWebPieceTagsTable(webDb)

	return webDb
}
