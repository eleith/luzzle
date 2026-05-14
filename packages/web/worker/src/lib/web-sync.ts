import {
	getFrontmatterValues,
	type LuzzleSelectable,
	type LuzzleTables,
} from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Kysely } from 'kysely'
import type { Logger } from '../logger.js'
import type { WebDatabase, WebPieceTags } from '../db.js'
import { buildAssetMaps } from '../transforms/utils/assets.js'
import {
	buildWebPiece,
	generateUniqueSlug,
	sanitizeMetadata,
	slugify,
} from './sync-helpers.js'

type PiecesItem = LuzzleSelectable<'pieces_items'>
type FullDb = Kysely<WebDatabase & LuzzleTables>

export async function runWebSync(
	db: FullDb,
	config: Config,
	logger: Logger
): Promise<void> {
	logger.info('web.sync starting')

	const livePaths = new Set<string>()

	for (const pieceConfig of config.pieces) {
		const items = await db
			.selectFrom('pieces_items')
			.selectAll()
			.where('type', '=', pieceConfig.type)
			.execute()

		const existing = await db
			.selectFrom('web_pieces')
			.select(['slug', 'file_path'])
			.where('type', '=', pieceConfig.type)
			.execute()
		const usedSlugs = new Set<string>(existing.map((p) => p.slug))
		const slugByFilePath = new Map<string, string>(
			existing.map((p) => [p.file_path, p.slug])
		)

		for (const item of items) {
			livePaths.add(item.file_path)
			await syncOne(db, item, pieceConfig, config, usedSlugs, slugByFilePath, logger)
		}
	}

	const stored = await db.selectFrom('web_pieces').select('file_path').execute()
	for (const row of stored) {
		if (!livePaths.has(row.file_path)) {
			await db.deleteFrom('web_pieces').where('file_path', '=', row.file_path).execute()
			logger.info(`web piece pruned: ${row.file_path}`)
		}
	}

	logger.info('web.sync complete')
}

async function syncOne(
	db: FullDb,
	item: PiecesItem,
	pieceConfig: Config['pieces'][number],
	config: Config,
	usedSlugs: Set<string>,
	slugByFilePath: Map<string, string>,
	logger: Logger
): Promise<void> {
	let slug: string
	const existingSlug = slugByFilePath.get(item.file_path)
	if (existingSlug) {
		slug = existingSlug
	} else {
		const filename = item.file_path.split('/').pop()!.replace(/\.md$/, '').split('.')[0]
		slug = generateUniqueSlug(usedSlugs, filename)
		slugByFilePath.set(item.file_path, slug)
	}

	const frontmatter = JSON.parse(item.frontmatter_json)
	const keywords = pieceConfig.fields.tags
		? getFrontmatterValues<string>(frontmatter, pieceConfig.fields.tags).flat().filter(Boolean)
		: []

	const { pathToKey } = buildAssetMaps(item.assets_json_array, config.assets.salt)
	const sanitizedItem: PiecesItem = {
		...item,
		frontmatter_json: sanitizeMetadata(item.frontmatter_json, pathToKey),
	}

	const webPiece = buildWebPiece(
		sanitizedItem,
		pieceConfig,
		slug,
		config.assets.salt,
		frontmatter,
		keywords
	)

	await db
		.insertInto('web_pieces')
		.values(webPiece)
		.onConflict((oc) =>
			oc.column('id').doUpdateSet({
				title: webPiece.title,
				summary: webPiece.summary,
				note: webPiece.note,
				keywords: webPiece.keywords,
				json_metadata: webPiece.json_metadata,
				date_updated: webPiece.date_updated,
				date_consumed: webPiece.date_consumed,
			})
		)
		.execute()

	await db.deleteFrom('web_pieces_tags').where('piece_id', '=', item.id).execute()

	if (keywords.length > 0) {
		const tags: WebPieceTags[] = keywords.map((tag) => ({
			piece_slug: slug,
			piece_type: item.type,
			piece_id: item.id,
			tag: tag.trim(),
			slug: slugify(tag.trim()),
		}))
		await db.insertInto('web_pieces_tags').values(tags).execute()
	}

	logger.info(`web piece synced: ${item.file_path}`)
}
