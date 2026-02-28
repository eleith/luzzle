import {
	type LuzzleDatabase,
	sql,
	LuzzleSelectable,
	getFrontmatterValue,
	getFrontmatterValues,
} from '@luzzle/core'
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
		.addColumn('piece_asset_path', 'text', (col) => col.defaultTo(null))
		.addColumn('transformation', 'text', (col) => col.notNull())
		.addColumn('asset_path', 'text', (col) => col.notNull())
		.addColumn('piece_field_path', 'text')
		.addColumn('mime_type', 'text', (col) => col.notNull())
		.addColumn('is_embedded', 'boolean', (col) => col.defaultTo(0))
		.addColumn('content', 'text')
		.addPrimaryKeyConstraint('web_pieces_assets_pk', [
			'piece_file_path',
			'transformation',
			'piece_asset_path',
		])
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

	await sql`CREATE VIRTUAL TABLE IF NOT EXISTS "web_pieces_fts5" USING fts5(id UNINDEXED, key UNINDEXED, slug, type UNINDEXED, title, summary, note, keywords, json_metadata, date_added UNINDEXED, date_updated UNINDEXED, date_consumed UNINDEXED, file_path UNINDEXED, tokenize = 'porter ascii', prefix='3 4 5', content = 'web_pieces', content_rowid="rowid")`.execute(
		db
	)

	await sql`CREATE TRIGGER IF NOT EXISTS web_pieces_after_insert AFTER INSERT ON web_pieces		BEGIN 
		INSERT INTO web_pieces_fts5(rowid, key, slug, type, title, summary, note, keywords, json_metadata, date_added, date_updated, date_consumed) 
		VALUES(new.rowid, new.key, new.slug, new.type, new.title, new.summary, new.note, new.keywords, new.json_metadata, new.date_added, new.date_updated, new.date_consumed); 
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

function mapPieceItemToWebPiece(
	item: LuzzleSelectable<'pieces_items'>,
	pieceConfig: Config['pieces'][number],
	slug: string,
	config: Config
): WebPieces {
	const frontmatter = JSON.parse(item.frontmatter_json)
	const title = getFrontmatterValue<string>(frontmatter, pieceConfig.fields.title) || ''
	const dateConsumed = getFrontmatterValue<number>(
		frontmatter,
		pieceConfig.fields.date_consumed
	) as unknown as number
	const key = generateAssetKey(item.file_path, config.assets.salt)

	const summary = pieceConfig.fields.summary
		? getFrontmatterValue<string>(frontmatter, pieceConfig.fields.summary)
		: undefined

	const keywords = pieceConfig.fields.tags
		? getFrontmatterValues<string>(frontmatter, pieceConfig.fields.tags).flat()
		: undefined

	return {
		slug,
		type: item.type as WebPieces['type'],
		id: item.id,
		key,
		file_path: item.file_path,
		title: title,
		summary,
		note: item.note_markdown,
		keywords: keywords ? JSON.stringify(keywords) : undefined,
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
			const mapping = mapPieceItemToWebPiece(item, pieceConfig, slug, config)
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

	for (const item of items) {
		const configHasPieceType = config.pieces.some((p) => p.type === item.type)
		const mediaFields = config.pieces
			.flatMap((piece) => piece.fields.media)
			.filter((x): x is string => x !== undefined)
		const attachmentFields = config.pieces
			.flatMap((piece) => piece.fields.attachments)
			.filter((x): x is string => x !== undefined)

		if (!configHasPieceType) continue

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

		const frontmatter = JSON.parse(item.frontmatter_json)

		for (const field of mediaFields) {
			const assets = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
			if (assets.length === 0) {
				console.warn(`[Media] No assets found at path "${field}" for ${item.file_path}`)
				continue
			}

			for (const asset of assets) {
				const mimeType = mime.lookup(asset) || 'application/octet-stream'
				if (!mimeType.startsWith('image/')) {
					console.warn(
						`[Media] Skipping non-image file "${asset}" in media field for ${item.file_path}`
					)
					continue
				}

				const assetPath = getAssetPath(item.type, key, asset)
				values.push({
					piece_file_path: item.file_path,
					piece_key: key,
					piece_asset_path: asset,
					piece_field_path: field,
					transformation: 'original',
					asset_path: assetPath,
					mime_type: mimeType,
				})

				for (const format of ['avif', 'jpg'] as const) {
					for (const [category, width] of Object.entries(ASSET_SIZES)) {
						const variantPath = getImageAssetPath(item.type, key, asset, width, format)
						values.push({
							piece_file_path: item.file_path,
							piece_key: key,
							piece_asset_path: asset,
							piece_field_path: field,
							transformation: `image.${category}.${format}`,
							asset_path: variantPath,
							mime_type: mime.lookup(format) as string,
						})
					}
				}
			}
		}

		for (const field of attachmentFields) {
			const assets = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
			if (assets.length === 0) {
				console.warn(`[Attachment] No assets found at path "${field}" for ${item.file_path}`)
				continue
			}

			for (const asset of assets) {
				const assetPath = getAssetPath(item.type, key, asset)
				const mimeType = mime.lookup(asset) || 'application/octet-stream'

				values.push({
					piece_file_path: item.file_path,
					piece_key: key,
					piece_asset_path: asset,
					transformation: 'original',
					asset_path: assetPath,
					mime_type: mimeType,
				})
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

	console.log(
		`${config.paths.database}: ${pieces.length} pieces | ${tags.length} tags | ${assets.length} assets`
	)
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
