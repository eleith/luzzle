import { previewSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs/openworkflow'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import path from 'node:path'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { getWorkerContext } from '../services/context.js'
import { generateAssetKey } from '../assets/key.js'
import { previewParseStep } from '../steps/preview-parse.js'
import { PREVIEW_TRANSFORM_NAMES, previewTransformStep } from '../steps/preview-transform.js'
import type { PreviewAsset } from '@luzzle/web.jobs'

export function registerPreviewWorkflow(): void {
	const ow = getOpenWorkflow()

	ow.implementWorkflow(previewSpec, async ({ input, step, run }) => {
		const ctx = getWorkerContext()
		const { logger, config } = ctx
		logger.info('openworkflow preview starting', { filePath: input.filePath, runId: run.id })

		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)

		// 1. Run preview parsing and serialize Map objects for database persistence
		const parsedSerialized = await step.run({ name: 'parse' }, async () => {
			const res = await previewParseStep.run({ filePath: input.filePath, pieces }, ctx)
			if (res.status === 'skipped') {
				throw new Error('Preview parse step was skipped unexpectedly')
			}
			const val = res.value
			return {
				type: val.type,
				slug: val.slug,
				webPiece: val.webPiece,
				pathToKey: Array.from(val.pathToKey.entries()),
				keyToPath: Array.from(val.keyToPath.entries()),
				sanitizedFrontmatter: val.sanitizedFrontmatter,
				note: val.note,
			}
		})

		const parsed = {
			...parsedSerialized,
			pathToKey: new Map(parsedSerialized.pathToKey),
			keyToPath: new Map(parsedSerialized.keyToPath),
		}

		if (!parsed) {
			throw new Error('preview parse returned no result')
		}

		const outDir = path.join(path.dirname(config.paths.assets), 'previews', run.id)
		const transforms: PreviewAsset[] = []
		const priorAssets: PublicWebPieceAsset[] = []

		// 2. Run preview transforms sequentially
		for (const name of PREVIEW_TRANSFORM_NAMES) {
			try {
				const records = await step.run({ name: `transform-${name}` }, async () => {
					const res = await previewTransformStep(name).run(
						{
							parsed,
							pieces,
							outDir,
							priorAssets,
						},
						ctx
					)
					if (res.status === 'skipped') {
						return []
					}
					return res.value
				})

				if (!records) continue
				for (const r of records) {
					const assetKey = generateAssetKey(
						r.piece_asset_path || input.filePath,
						config.assets.salt
					)
					transforms.push({ ...r, asset_key: assetKey })
					priorAssets.push({
						asset_key: assetKey,
						transformation: r.transformation,
						asset_path: r.asset_path,
						mime_type: r.mime_type,
						is_embedded: r.is_embedded,
						content: r.content,
					})
				}
			} catch (error) {
				logger.error(`openworkflow preview transform.${name} failed`, {
					error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
				})
			}
		}

		logger.info('openworkflow preview complete', { filePath: input.filePath, runId: run.id })

		return {
			filePath: input.filePath,
			type: parsed.type,
			slug: parsed.slug,
			pieceKey: parsed.webPiece.key,
			sanitizedFrontmatter: parsed.sanitizedFrontmatter,
			note: parsed.note,
			pathToKey: Object.fromEntries(parsed.pathToKey),
			transforms,
		}
	})
}
