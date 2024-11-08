import { type LuzzleDatabase, getDatabaseClient, sql } from '@luzzle/core'
import { WebPieceTags, type WebPieces } from '../../src/lib/pieces/types'
import slugify from '@sindresorhus/slugify'

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

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)
}

async function populateWebPieceBooks(db: LuzzleDatabase): Promise<void> {
	const bookToWebPieceMap: Record<keyof WebPieces, string> = {
		id: 'id',
		slug: 'slug',
		title: `json_extract(frontmatter_json, '$.title')`,
		type: "'books'",
		summary: `json_extract(frontmatter_json, '$.description')`,
		note: 'note_markdown',
		media: `json_extract(frontmatter_json, '$.cover')`,
		keywords: `json_extract(frontmatter_json, '$.keywords')`,
		date_added: 'date_added',
		date_updated: 'date_updated',
		date_consumed: `json_extract(frontmatter_json, '$.date_read')`,
		json_metadata: 'frontmatter_json'
	}

	const webColumns = Object.keys(bookToWebPieceMap).join(', ')
	const bookColumns = Object.values(bookToWebPieceMap).join(', ')

	await sql`INSERT INTO web_pieces (${sql.raw(webColumns)}) SELECT ${sql.raw(
		bookColumns
	)} FROM pieces_items WHERE type='books'`.execute(db)
}

async function populateWebPieceFilms(db: LuzzleDatabase): Promise<void> {
	const filmToWebPieceMap: Record<keyof WebPieces, string> = {
		id: 'id',
		slug: 'slug',
		title: `json_extract(frontmatter_json, '$.title')`,
		type: "'films'",
		summary: `json_extract(frontmatter_json, '$.summary')`,
		note: 'note_markdown',
		media: `json_extract(frontmatter_json, '$.poster')`,
		keywords: `json_extract(frontmatter_json, '$.keywords')`,
		date_added: 'date_added',
		date_updated: 'date_updated',
		date_consumed: `json_extract(frontmatter_json, '$.date_viewed')`,
		json_metadata: 'frontmatter_json'
	}

	const webColumns = Object.keys(filmToWebPieceMap).join(', ')
	const filmColumns = Object.values(filmToWebPieceMap).join(', ')

	await sql`INSERT INTO web_pieces (${sql.raw(webColumns)}) SELECT ${sql.raw(
		filmColumns
	)} FROM pieces_items WHERE type='films'`.execute(db)
}

async function populateWebPieceGames(db: LuzzleDatabase): Promise<void> {
	const gameToWebPieceMap: Record<keyof WebPieces, string> = {
		id: 'id',
		slug: 'slug',
		title: `json_extract(frontmatter_json, '$.title')`,
		type: "'games'",
		summary: `json_extract(frontmatter_json, '$.description')`,
		note: 'note_markdown',
		media: `json_extract(frontmatter_json, '$.representative_image')`,
		keywords: `json_extract(frontmatter_json, '$.keywords')`,
		date_added: 'date_added',
		date_updated: 'date_updated',
		date_consumed: `json_extract(frontmatter_json, '$.date_played')`,
		json_metadata: 'frontmatter_json'
	}

	const webColumns = Object.keys(gameToWebPieceMap).join(', ')
	const gameColumns = Object.values(gameToWebPieceMap).join(', ')

	await sql`INSERT INTO web_pieces (${sql.raw(webColumns)}) SELECT ${sql.raw(
		gameColumns
	)} FROM pieces_items WHERE type='games'`.execute(db)
}

async function populateWebPieceLinks(db: LuzzleDatabase): Promise<void> {
	const linkToWebPieceMap: Record<keyof WebPieces, string> = {
		id: 'id',
		slug: 'slug',
		title: `json_extract(frontmatter_json, '$.title')`,
		type: "'links'",
		summary: `json_extract(frontmatter_json, '$.summary')`,
		note: 'note_markdown',
		media: `json_extract(frontmatter_json, '$.representative_image')`,
		keywords: `json_extract(frontmatter_json, '$.keywords')`,
		date_added: 'date_added',
		date_updated: 'date_updated',
		date_consumed: `json_extract(frontmatter_json, '$.date_accessed')`,
		json_metadata: 'frontmatter_json'
	}

	const webColumns = Object.keys(linkToWebPieceMap).join(', ')
	const linkColumns = Object.values(linkToWebPieceMap).join(', ')

	await sql`INSERT INTO web_pieces (${sql.raw(webColumns)}) SELECT ${sql.raw(
		linkColumns
	)} FROM pieces_items WHERE type='links'`.execute(db)
}

async function populateWebPieceTexts(db: LuzzleDatabase): Promise<void> {
	const textToWebPieceMap: Record<keyof WebPieces, string> = {
		id: 'id',
		slug: 'slug',
		title: `json_extract(frontmatter_json, '$.title')`,
		type: "'texts'",
		summary: `json_extract(frontmatter_json, '$.summary')`,
		note: 'note_markdown',
		media: `json_extract(frontmatter_json, '$.representative_image')`,
		keywords: `json_extract(frontmatter_json, '$.keywords')`,
		date_added: 'date_added',
		date_updated: 'date_updated',
		date_consumed: `json_extract(frontmatter_json, '$.date_published')`,
		json_metadata: 'frontmatter_json'
	}

	const webColumns = Object.keys(textToWebPieceMap).join(', ')
	const textColumns = Object.values(textToWebPieceMap).join(', ')

	await sql`INSERT INTO web_pieces (${sql.raw(webColumns)}) SELECT ${sql.raw(
		textColumns
	)} FROM pieces_items WHERE type='texts'`.execute(db)
}

async function populateWebPieceSearch(db: LuzzleDatabase): Promise<void> {
	await sql`INSERT INTO web_pieces_fts5(web_pieces_fts5) VALUES('rebuild')`.execute(db)
}

async function populateWebPieceTagsTable(db: LuzzleDatabase): Promise<void> {
	const tags = await sql<{
		slug: string
		type: WebPieces['type']
		tag: string
		id: string
	}>`SELECT web_pieces.slug, web_pieces.id, web_pieces.type, json_each.value as tag FROM web_pieces, json_each(web_pieces.keywords)`.execute(
		db
	)
	const webDb = db.withTables<{ web_pieces_tags: WebPieceTags }>()
	const values: Array<WebPieceTags> = []

	tags.rows.forEach((tag) => {
		if (tag) {
			values.push({
				piece_slug: tag.slug,
				piece_type: tag.type,
				tag: tag.tag.trim(),
				slug: slugify(tag.tag.trim()),
				piece_id: tag.id
			})
		}
	})

	if (values.length) {
		const batches = batchArray(values, 1000)
		for (const batch of batches) {
			await webDb.insertInto('web_pieces_tags').values(batch).execute()
		}
	}
}

export async function initialize(databasePath: string) {
	const db = getDatabaseClient(databasePath)

	await db.schema.dropTable('web_pieces_fts5').ifExists().execute()
	await db.schema.dropTable('web_pieces').ifExists().execute()
	await db.schema.dropTable('web_pieces_tags').ifExists().execute()

	await createWebTables(db)
	await populateWebPieceBooks(db)
	await populateWebPieceFilms(db)
	await populateWebPieceGames(db)
	await populateWebPieceLinks(db)
	await populateWebPieceTexts(db)
	await populateWebPieceSearch(db)
	await populateWebPieceTagsTable(db)

	return db.withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
		web_pieces_tags: WebPieceTags
	}>()
}
