import { Job } from '@sidequest/core'
import { Pieces, StorageFileSystem, type PieceFrontmatter } from '@luzzle/core'
import { getWorkerContext } from './context.js'
import { JobProgress } from '../lib/job-progress.js'
import { setActivePhase, clearActivePhase } from '../lib/phase-logger.js'
import {
	PREVIEW_TRANSFORM_NAMES,
	parsePreview,
	runPreviewTransform,
} from '../lib/preview.js'
import { generateAssetKey } from '../assets/key.js'
import type { AssetRecord } from '../transforms/utils/types.js'

export interface PreviewPayload {
	filePath: string
}

export interface PreviewAsset extends AssetRecord {
	asset_key: string
}

export interface PreviewResult {
	filePath: string
	type: string
	slug: string
	pieceKey: string
	sanitizedFrontmatter: PieceFrontmatter
	note: string
	pathToKey: Record<string, string>
	transforms: PreviewAsset[]
}

export class Preview extends Job {
	async run(payload: PreviewPayload): Promise<PreviewResult> {
		const { logger, db, config } = getWorkerContext()
		const jobId = this.id
		const progress = new JobProgress(db, 2)

		logger.info('preview starting', { filePath: payload.filePath })

		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)

		await progress.start(jobId, 'parse')
		setActivePhase({ jobId, phase: 'parse' })
		let parsed
		try {
			parsed = await parsePreview(payload.filePath, config, pieces)
			await progress.complete(jobId, 'parse')
		} catch (err) {
			await progress.fail(jobId, 'parse', err)
			throw err
		} finally {
			clearActivePhase()
		}

		const transforms: PreviewAsset[] = []
		for (const phase of PREVIEW_TRANSFORM_NAMES) {
			await progress.start(jobId, phase)
			setActivePhase({ jobId, phase })
			try {
				const records = await runPreviewTransform(phase, parsed, config, pieces, logger)
				for (const r of records) {
					transforms.push({
						...r,
						asset_key: generateAssetKey(
							r.piece_asset_path || payload.filePath,
							config.assets.salt
						),
					})
				}
				await progress.complete(jobId, phase, `${records.length} record(s)`)
			} catch (err) {
				await progress.fail(jobId, phase, err)
			} finally {
				clearActivePhase()
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
