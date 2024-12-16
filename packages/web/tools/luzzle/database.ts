import { type LuzzleDatabase, getDatabaseClient, sql } from '@luzzle/core'
import { WebPieceTags, type WebPieces } from '../../src/lib/pieces/types'
import slugify from '@sindresorhus/slugify'
import path from 'path'

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
		.addUniqueConstraint('slug-type', ['slug', 'type'])
		.execute()

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)
}

async function populatePieceItems(db: LuzzleDatabase): Promise<void> {
	const webDb = db.withTables<{ web_pieces: WebPieces }>()
	const items = await db.selectFrom('pieces_items').selectAll().execute()
	const values: Array<WebPieces> = []
	const typeSlugs = new Set<string>()

	items.forEach((item) => {
		const frontmatter = JSON.parse(item.frontmatter_json)
		const filename = path.basename(item.file_path, '.md').split('.')[0]
		const type = item.type as WebPieces['type']
		const slug = slugify(filename)
		let finalSlug = slug
		let count = 0

		if (typeSlugs.has(`${type}-${slug}-${count}`)) {
			count = 1
			while (typeSlugs.has(`${type}-${slug}-${count}`)) {
				count++
			}
			finalSlug = `${slug}--${count}`
		}

		typeSlugs.add(`${type}-${slug}-${count}`)

		values.push({
			slug: finalSlug,
			type: item.type as WebPieces['type'],
			id: item.id,
			title: frontmatter.title,
			summary: frontmatter.description || frontmatter.summary,
			note: item.note_markdown,
			media: frontmatter.cover || frontmatter.poster || frontmatter.representative_image,
			keywords: frontmatter.keywords,
			date_added: item.date_added,
			date_consumed:
				frontmatter.date_read ||
				frontmatter.date_viewed ||
				frontmatter.date_played ||
				frontmatter.date_accessed ||
				frontmatter.date_published,
			json_metadata: item.frontmatter_json,
			...(item.date_updated && { date_updated: item.date_updated })
		})
	})

	await webDb.transaction().execute(async (tx) => {
		if (values.length) {
			const batches = batchArray(values, 1000)
			for (const batch of batches) {
				await tx.insertInto('web_pieces').values(batch).execute()
			}
		}
	})
}

async function populateWebPieceSearch(db: LuzzleDatabase): Promise<void> {
	await sql`INSERT INTO web_pieces_fts5(web_pieces_fts5) VALUES('rebuild')`.execute(db)
}

async function populateWebPieceTags(db: LuzzleDatabase): Promise<void> {
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
		const name = tag.tag.trim()
		if (name) {
			values.push({
				piece_slug: tag.slug,
				piece_type: tag.type,
				tag: name,
				slug: slugify(name),
				piece_id: tag.id
			})
		}
	})

	await webDb.transaction().execute(async (tx) => {
		if (values.length) {
			const batches = batchArray(values, 1000)
			for (const batch of batches) {
				await tx.insertInto('web_pieces_tags').values(batch).execute()
			}
		}
	})
}

export async function initialize(databasePath: string) {
	const db = getDatabaseClient(databasePath)

	await db.schema.dropTable('web_pieces_fts5').ifExists().execute()
	await db.schema.dropTable('web_pieces').ifExists().execute()
	await db.schema.dropTable('web_pieces_tags').ifExists().execute()

	await createWebTables(db)
	await populatePieceItems(db)
	await populateWebPieceSearch(db)
	await populateWebPieceTags(db)

	return db.withTables<{
		web_pieces: WebPieces
		web_pieces_fts5: WebPieces
		web_pieces_tags: WebPieceTags
	}>()
}
