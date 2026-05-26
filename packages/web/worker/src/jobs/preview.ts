import { Job } from '@sidequest/core'
import { Pieces, StorageFileSystem } from '@luzzle/core'
import path from 'node:path'
import type { PublicWebPieceAsset } from '@luzzle/web.pieces'
import { getWorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { StepRunner } from '../core/step-runner.js'
import { generateAssetKey } from '../assets/key.js'
import { previewParseStep } from '../steps/preview-parse.js'
import {
	PREVIEW_TRANSFORM_NAMES,
	previewTransformStep,
} from '../steps/preview-transform.js'
import type { PreviewPayload, PreviewAsset, PreviewResult } from '@luzzle/web.jobs'

export type { PreviewPayload, PreviewAsset, PreviewResult }

export class Preview extends Job {
	async run(payload: PreviewPayload): Promise<PreviewResult> {
		const ctx = getWorkerContext()
		const { logger, db, config } = ctx
		logger.info('preview starting', { filePath: payload.filePath })

		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)

		const progress = new JobProgress(db, 2)
		const runner = new StepRunner(ctx, progress, this.id)

		const parsed = await runner.run(previewParseStep, {
			filePath: payload.filePath,
			pieces,
		})
		if (!parsed) {
			throw new Error('preview parse returned no result')
		}

		const outDir = path.join(path.dirname(config.paths.assets), 'previews', this.id.toString())
		const transforms: PreviewAsset[] = []
		const priorAssets: PublicWebPieceAsset[] = []
		for (const name of PREVIEW_TRANSFORM_NAMES) {
			try {
				const records = await runner.run(previewTransformStep(name), {
					parsed,
					pieces,
					outDir,
					priorAssets
				})
				if (!records) continue
				for (const r of records) {
					const assetKey = generateAssetKey(
						r.piece_asset_path || payload.filePath,
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
				logger.error(`preview transform.${name} failed`, {
					error: error instanceof Error ? { message: error.message, stack: error.stack } : error
				})
			}
		}

		logger.info('preview complete', { filePath: payload.filePath })

		return {
			filePath: payload.filePath,
			type: parsed.type,
			slug: parsed.slug,
			pieceKey: parsed.webPiece.key,
			sanitizedFrontmatter: parsed.sanitizedFrontmatter,
			note: parsed.note,
			pathToKey: Object.fromEntries(parsed.pathToKey),
			transforms,
		}
	}
}
