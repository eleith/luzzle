import {
	type LuzzleSelectable,
	type LuzzleTables,
} from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Kysely } from 'kysely'
import type { Logger } from '../../services/logger.js'
import type { WebDatabase, WebPieceTags } from '../../services/db.js'
import { buildAssetMaps } from '../../transforms/utils/assets.js'
import { completed, type Step, type StepResult } from '../../core/step.js'
import {
	buildWebPiece,
	generateUniqueSlug,
	sanitizeMetadata,
	slugify,
} from './helpers.js'

type PiecesItem = LuzzleSelectable<'pieces_items'>
type FullDb = Kysely<WebDatabase & LuzzleTables>

export interface WebSyncInput {
	filePaths: string[]
}

export const webSyncStep: Step<WebSyncInput, void> = {
	name: 'web.sync',
	async run({ filePaths }, ctx): Promise<StepResult<void>> {
		const { db, config, logger } = ctx
		const fullDb = db as unknown as FullDb

		logger.info('web.sync starting', { count: filePaths.length })

		const targets = new Set(filePaths)
		const livePaths = new Set<string>()

		for (const pieceConfig of config.pieces) {
			const items = await fullDb
				.selectFrom('pieces_items')
				.selectAll()
				.where('type', '=', pieceConfig.type)
				.execute()

			const existing = await fullDb
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
				if (!targets.has(item.file_path)) continue
				await syncOne(fullDb, item, pieceConfig, config, usedSlugs, slugByFilePath, logger)
			}
		}

		const stored = await fullDb.selectFrom('web_pieces').select('file_path').execute()
		for (const row of stored) {
			if (!livePaths.has(row.file_path)) {
				await fullDb.deleteFrom('web_pieces').where('file_path', '=', row.file_path).execute()
				logger.info(`web piece pruned: ${row.file_path}`)
			}
		}

		logger.info('web.sync complete')
		return completed(undefined)
	},
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

	const keywords: string[] = webPiece.keywords ? JSON.parse(webPiece.keywords) : []
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
