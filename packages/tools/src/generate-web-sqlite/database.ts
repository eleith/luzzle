import { type LuzzleDatabase, getDatabaseClient, sql } from '@luzzle/core'
import path from 'path'
import { ConfigSchema } from '../lib/config/config.schema.js'
import { PiecesItemsSelectable } from '@luzzle/core/dist/src/database/tables/pieces_items.schema.js'

interface WebPieces {
	id: string
	title: string
	slug: string
	file_path: string
	note?: string
	date_updated?: number
	date_added: number
	date_consumed?: number
	type: string
	media?: string
	json_metadata: string
	summary?: string
	keywords?: string
}

interface WebPieceTags {
	piece_slug: string
	piece_type: string
	piece_id: string
	tag: string
	slug: string
}

function batchArray<T>(array: T[], batchSize: number): T[][] {
	const batches: T[][] = []
	for (let i = 0; i < array.length; i += batchSize) {
		batches.push(array.slice(i, i + batchSize))
	}
	return batches
}

function slugify(text: string): string {
	return text
		.toString()
		.normalize('NFD') // Efficiently handle accented characters
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
}

async function dropWebTables(db: LuzzleDatabase): Promise<void> {
	await db.schema.dropTable('web_pieces_tags').ifExists().execute()
	await db.schema.dropTable('web_pieces').ifExists().execute()
	await db.schema.dropTable('web_pieces_fts5').ifExists().execute()
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
		.addColumn('file_path', 'text', (col) => col.notNull())
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

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, file_path UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)

	await sql`CREATE TRIGGER IF NOT EXISTS web_pieces_after_insert AFTER INSERT ON web_pieces		BEGIN 
		INSERT INTO web_pieces_fts5(rowid, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) 
		VALUES(new.rowid, new.slug, new.type, new.title, new.summary, new.note, new.media, new.keywords, new.json_metadata, new.date_added, new.date_updated, new.date_consumed); 
	END;`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_delete AFTER DELETE ON web_pieces 
	BEGIN 
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, slug, title, summary, note, keywords, json_metadata)  
		VALUES('delete', old.rowid, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata); 
	END;`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_update AFTER UPDATE ON web_pieces 
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, slug, title, summary, note, keywords, json_metadata) 
		VALUES('delete', old.rowid, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);
  
		INSERT INTO web_pieces_fts5(rowid, slug, title, summary, note, keywords, json_metadata) 
		VALUES (new.rowid, new.slug, new.title, new.summary, new.note, new.keywords, new.json_metadata);
	END;`.execute(db)
}

async function mapPieceItemToWebPiece(
	item: PiecesItemsSelectable,
	pieceConfig: ConfigSchema['pieces'][number],
	slug: string
) {
	const frontmatter = JSON.parse(item.frontmatter_json)
	const title = frontmatter[pieceConfig.fields.title]
	const dateConsumed = frontmatter[pieceConfig.fields.date_consumed]

	return {
		slug,
		type: item.type as WebPieces['type'],
		id: item.id,
		file_path: item.file_path,
		title: title,
		summary: pieceConfig.fields.summary ? frontmatter[pieceConfig.fields.summary] : undefined,
		note: item.note_markdown,
		media: pieceConfig.fields.media ? frontmatter[pieceConfig.fields.media] : undefined,
		keywords: pieceConfig.fields.tags ? frontmatter[pieceConfig.fields.tags] : undefined,
		date_added: item.date_added,
		date_consumed: dateConsumed,
		json_metadata: item.frontmatter_json,
		...(item.date_updated && { date_updated: item.date_updated }),
	}
}

function getUniqueSlug(existingSlugs: Set<string>, filename: string, type: string): string {
	const slug = slugify(filename)
	let finalSlug = slug
	let count = 0

	while (existingSlugs.has(`${type}-${slug}-${count}`)) {
		count++
		finalSlug = `${slug}--${count}`
	}

	existingSlugs.add(`${type}-${slug}-${count}`)

	return finalSlug
}

async function populateWebPieceItems(db: LuzzleDatabase, config: ConfigSchema): Promise<void> {
	const webDb = db.withTables<{ web_pieces: WebPieces }>()
	const items = await db.selectFrom('pieces_items').selectAll().execute()
	const values: Array<WebPieces> = []
	const typeSlugs = new Set<string>()

	for (const item of items) {
		const pieceConfig = config.pieces.find((p) => p.type === item.type)

		if (pieceConfig) {
			const filename = path.basename(item.file_path, '.md').split('.')[0]
			const slug = getUniqueSlug(typeSlugs, filename, item.type)
			const mapping = await mapPieceItemToWebPiece(item, pieceConfig, slug)
			values.push(mapping)
		}
	}

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
				piece_id: tag.id,
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

export async function generateWebSqlite(config: ConfigSchema) {
	const db = getDatabaseClient(config.paths.database)

	await dropWebTables(db)
	await createWebTables(db)

	await populateWebPieceItems(db, config)
	await populateWebPieceTags(db)
	await populateWebPieceSearch(db)

	const pieces = await db
		.withTables<{ web_pieces: WebPieces }>()
		.selectFrom('web_pieces')
		.selectAll()
		.execute()

	const tags = await db
		.withTables<{ web_pieces_tags: WebPieceTags }>()
		.selectFrom('web_pieces_tags')
		.selectAll()
		.execute()

	console.log(`${config.paths.database} has ${pieces.length} pieces and ${tags.length} tags`)
}
