import { type LuzzleDatabase, sql, LuzzleSelectable } from '@luzzle/core'
import path from 'path'
import {
	type WebPieces,
	type WebPieceTags,
	type Config,
	type WebPiecesAsset,
	getAssetPath,
	getImageAssetPath,
	ASSET_SIZES,
	getOpenGraphPath,
} from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import mime from 'mime-types'

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
	await db.schema.dropTable('web_pieces_assets').ifExists().execute()
	await db.schema.dropTable('web_pieces_tags').ifExists().execute()
	await db.schema.dropTable('web_pieces').ifExists().execute()
	await db.schema.dropTable('web_pieces_fts5').ifExists().execute()
}

async function createWebTables(db: LuzzleDatabase): Promise<void> {
	await db.schema
		.createTable('web_pieces_assets')
		.ifNotExists()
		.addColumn('piece_file_path', 'text', (col) => col.notNull())
		.addColumn('piece_key', 'text', (col) => col.notNull())
		.addColumn('piece_asset_path', 'text')
		.addColumn('transformation', 'text', (col) => col.notNull())
		.addColumn('asset_path', 'text', (col) => col.notNull())
		.addColumn('mime_type', 'text', (col) => col.notNull())
		.addColumn('is_embedded', 'boolean', (col) => col.notNull().defaultTo(0))
		.addColumn('content', 'text')
		.addPrimaryKeyConstraint('web_pieces_assets_pk', ['piece_file_path', 'transformation'])
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
		.addColumn('media', 'text')
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

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, key UNINDEXED, slug, type UNINDEXED, title, summary, note, media UNINDEXED, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, file_path UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)

	await sql`CREATE TRIGGER IF NOT EXISTS web_pieces_after_insert AFTER INSERT ON web_pieces		BEGIN 
		INSERT INTO web_pieces_fts5(rowid, key, slug, type, title, summary, note, media, keywords, json_metadata, date_added, date_updated, date_consumed) 
		VALUES(new.rowid, new.key, new.slug, new.type, new.title, new.summary, new.note, new.media, new.keywords, new.json_metadata, new.date_added, new.date_updated, new.date_consumed); 
	END;`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_delete AFTER DELETE ON web_pieces 
	BEGIN 
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata)  
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata); 
	END;`.execute(db)

	await sql`CREATE TRIGGER web_pieces_after_update AFTER UPDATE ON web_pieces 
	BEGIN
		INSERT INTO web_pieces_fts5(web_pieces_fts5, rowid, key, slug, title, summary, note, keywords, json_metadata) 
		VALUES('delete', old.rowid, old.key, old.slug, old.title, old.summary, old.note, old.keywords, old.json_metadata);
  
		INSERT INTO web_pieces_fts5(rowid, key, slug, title, summary, note, keywords, json_metadata) 
		VALUES (new.rowid, new.key, new.slug, new.title, new.summary, new.note, new.keywords, new.json_metadata);
	END;`.execute(db)
}

async function mapPieceItemToWebPiece(
	item: LuzzleSelectable<'pieces_items'>,
	pieceConfig: Config['pieces'][number],
	slug: string,
	config: Config
) {
	const frontmatter = JSON.parse(item.frontmatter_json)
	const title = frontmatter[pieceConfig.fields.title]
	const dateConsumed = frontmatter[pieceConfig.fields.date_consumed]
	const key = generateAssetKey(item.file_path, config.assets.salt)

	return {
		slug,
		type: item.type as WebPieces['type'],
		id: item.id,
		key,
		file_path: item.file_path,
		title: title,
		summary: pieceConfig.fields.summary ? frontmatter[pieceConfig.fields.summary] : undefined,
		note: item.note_markdown,
		media: pieceConfig.fields.media ? frontmatter[pieceConfig.fields.media] : undefined,
		keywords: pieceConfig.fields.tags
			? JSON.stringify(frontmatter[pieceConfig.fields.tags] || [])
			: undefined,
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

async function populateWebPieceItems(db: LuzzleDatabase, config: Config): Promise<void> {
	const webDb = db.withTables<{ web_pieces: WebPieces }>()
	const items = await db.selectFrom('pieces_items').selectAll().execute()
	const values: Array<WebPieces> = []
	const typeSlugs = new Set<string>()

	for (const item of items) {
		const pieceConfig = config.pieces.find((p) => p.type === item.type)

		if (pieceConfig) {
			const filename = path.basename(item.file_path, '.md').split('.')[0]
			const slug = getUniqueSlug(typeSlugs, filename, item.type)
			const mapping = await mapPieceItemToWebPiece(item, pieceConfig, slug, config)
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

async function populateWebPiecesAssets(db: LuzzleDatabase, config: Config): Promise<void> {
	const items = await db.selectFrom('pieces_items').selectAll().execute()
	const values: Array<WebPiecesAsset> = []

	const pieceFields = config.pieces.reduce(
		(acc, piece) => {
			const mediaField = piece.fields.media
			const assetFields = piece.fields.assets || []
			const type = piece.type
			acc[type] = [mediaField, ...assetFields].filter(Boolean) as string[]
			return acc
		},
		{} as Record<string, string[]>
	)

	const sizeCategoryMap = Object.entries(ASSET_SIZES).reduce((acc, [category, width]) => {
		acc[width] = category
		return acc
	}, {} as Record<number, string>)

	for (const item of items) {
		const fields = pieceFields[item.type] || []
		const key = generateAssetKey(item.file_path, config.assets.salt)

		const ogPath = getOpenGraphPath(item.type, key)
		values.push({
			piece_file_path: item.file_path,
			piece_key: key,
			transformation: 'opengraph',
			asset_path: ogPath,
			mime_type: 'image/png',
			is_embedded: 0,
		})

		if (fields.length) {
			const frontmatter = JSON.parse(item.frontmatter_json)
			const assets = fields.flatMap((field) => frontmatter[field]).filter(Boolean) as string[]
			const uniqueAssets = Array.from(new Set(assets))

			for (const asset of uniqueAssets) {
				const assetPath = getAssetPath(item.type, key, asset)
				const mimeType = mime.lookup(asset) || 'application/octet-stream'

				values.push({
					piece_file_path: item.file_path,
					piece_key: key,
					piece_asset_path: asset,
					transformation: 'original',
					asset_path: assetPath,
					mime_type: mimeType,
					is_embedded: 0,
				})

				if (mimeType.startsWith('image')) {
					for (const format of ['avif', 'jpg'] as const) {
						for (const width of Object.values(ASSET_SIZES)) {
							const variantPath = getImageAssetPath(item.type, key, asset, width, format)
							const sizeCategory = sizeCategoryMap[width]

							values.push({
								piece_file_path: item.file_path,
								piece_key: key,
								piece_asset_path: asset,
								transformation: `image.${sizeCategory}.${format}`,
								asset_path: variantPath,
								mime_type: mime.lookup(format) as string,
								is_embedded: 0,
							})
						}
					}
				}
			}
		}
	}

	const webDb = db.withTables<{ web_pieces_assets: WebPiecesAsset }>()
	await webDb.transaction().execute(async (tx) => {
		if (values.length) {
			const batches = batchArray(values, 1000)
			for (const batch of batches) {
				await tx.insertInto('web_pieces_assets').values(batch).execute()
			}
		}
	})
}

async function generateWebSqlite(db: LuzzleDatabase, config: Config) {
	await dropWebTables(db)
	await createWebTables(db)

	await populateWebPieceItems(db, config)
	await populateWebPieceTags(db)
	await populateWebPieceSearch(db)

	await populateWebPiecesAssets(db, config)

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

	const assets = await db
		.withTables<{ web_pieces_assets: WebPiecesAsset }>()
		.selectFrom('web_pieces_assets')
		.selectAll()
		.execute()

	console.log(`${config.paths.database}: ${pieces.length} pieces | ${tags.length} tags | ${assets.length} assets`)
}

export {
	dropWebTables,
	createWebTables,
	populateWebPieceItems,
	populateWebPieceTags,
	populateWebPieceSearch,
	populateWebPiecesAssets,
	generateWebSqlite,
}
