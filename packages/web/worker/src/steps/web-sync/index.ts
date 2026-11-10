import type { LuzzleSelectable } from '@luzzle/core'
import { completed, type Step } from '../../core/step.js'
import type { WebPieces } from '../../services/db.js'
import { buildAssetMaps } from '../../transforms/utils/assets.js'
import { buildWebPiece, generateUniqueSlug, sanitizeMetadata, slugify } from './helpers.js'

export interface PublicationSource {
	item: LuzzleSelectable<'pieces_items'>
	contentHash: string
}

export interface PreparedPublication {
	webPiece: WebPieces
	contentHash: string
	assetKeyToPath: Array<[string, string]>
	wasPublished: boolean
}

export const webSyncStep: Step<PublicationSource[], PreparedPublication[]> = {
	name: 'web.sync',
	async run(sources, { db, config, logger }) {
		const existing = await db
			.selectFrom('web_pieces')
			.select(['id', 'slug', 'type', 'file_path', 'date_added'])
			.execute()
		const publicationByPath = new Map(existing.map((piece) => [piece.file_path, piece]))
		const usedSlugs = new Map<string, Set<string>>()
		for (const piece of existing) {
			if (!usedSlugs.has(piece.type)) usedSlugs.set(piece.type, new Set())
			usedSlugs.get(piece.type)!.add(piece.slug)
		}
		const prepared: PreparedPublication[] = []
		for (const { item, contentHash } of sources) {
			const pieceConfig = config.pieces.find((piece) => piece.type === item.type)
			if (!pieceConfig) throw new Error(`Piece type is not configured: ${item.type}`)
			const previous = publicationByPath.get(item.file_path)
			if (previous && previous.type !== item.type) {
				throw new Error('Unpublish the previous piece type before publishing this source')
			}
			if (!usedSlugs.has(item.type)) usedSlugs.set(item.type, new Set())
			const slug =
				previous?.slug ??
				generateUniqueSlug(
					usedSlugs.get(item.type)!,
					item.file_path.split('/').pop()!.replace(/\.md$/, '').split('.')[0]
				)
			const frontmatter = JSON.parse(item.frontmatter_json)
			const { pathToKey, keyToPath } = buildAssetMaps(item.assets_json_array, config.assets.salt)
			const webPiece = buildWebPiece(
				{
					...item,
					id: previous?.id ?? item.id,
					date_added: previous?.date_added ?? item.date_added,
					frontmatter_json: sanitizeMetadata(item.frontmatter_json, pathToKey),
				},
				pieceConfig,
				slug,
				config.assets.salt,
				frontmatter
			)
			await db
				.insertInto('web_pieces')
				.values({ ...webPiece, content_hash: null })
				.onConflict((conflict) =>
					conflict.column('id').doUpdateSet({
						content_hash: null,
						key: webPiece.key,
						title: webPiece.title,
						summary: webPiece.summary ?? null,
						note: webPiece.note,
						keywords: webPiece.keywords ?? null,
						json_metadata: webPiece.json_metadata,
						date_updated: webPiece.date_updated,
						date_consumed: webPiece.date_consumed ?? null,
					})
				)
				.execute()
			await db.deleteFrom('web_pieces_tags').where('piece_id', '=', webPiece.id).execute()
			const keywords: string[] = webPiece.keywords ? JSON.parse(webPiece.keywords) : []
			if (keywords.length) {
				await db
					.insertInto('web_pieces_tags')
					.values(
						keywords.map((tag) => ({
							piece_slug: webPiece.slug,
							piece_type: webPiece.type,
							piece_id: webPiece.id,
							tag: tag.trim(),
							slug: slugify(tag.trim()),
						}))
					)
					.execute()
			}
			prepared.push({
				webPiece,
				contentHash,
				assetKeyToPath: [...keyToPath],
				wasPublished: Boolean(previous),
			})
			logger.info(`web piece synced: ${webPiece.file_path}`)
		}
		return completed(prepared)
	},
}

export const pruneWebPiecesStep: Step<void, void> = {
	name: 'web.prune',
	async run(_input, { db, config, logger }) {
		const live = await db
			.selectFrom('pieces_items')
			.select('file_path')
			.where(
				'type',
				'in',
				config.pieces.map((piece) => piece.type)
			)
			.execute()
		const livePaths = new Set(live.map((piece) => piece.file_path))
		const publications = await db.selectFrom('web_pieces').select('file_path').execute()
		for (const piece of publications) {
			if (!livePaths.has(piece.file_path)) {
				await db.deleteFrom('web_pieces').where('file_path', '=', piece.file_path).execute()
				logger.info(`web piece pruned: ${piece.file_path}`)
			}
		}
		return completed(undefined)
	},
}
