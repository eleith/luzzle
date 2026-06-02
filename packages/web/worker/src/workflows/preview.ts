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
import { JobProgress } from '../core/job-progress.js'
import { PhaseLogger } from '../core/phase-logger.js'

export function registerPreviewWorkflow(): void {
	const ow = getOpenWorkflow()

	ow.implementWorkflow(previewSpec, async ({ input, step, run }) => {
		const ctx = getWorkerContext()
		const { logger, config, db } = ctx

		// Fallback to random 32-bit integer if no jobId is supplied
		const jobId = input.jobId ?? Math.floor(Math.random() * 2147483647)
		const progress = new JobProgress(db)

		logger.info('openworkflow preview starting', { filePath: input.filePath, jobId, runId: run.id })

		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)

		// 1. Run preview parsing and serialize Map objects for database persistence
		const parsedSerialized = await step.run({ name: 'parse' }, async () => {
			if (logger instanceof PhaseLogger) {
				logger.setActivePhase({ jobId, phase: 'parse' })
			}
			await progress.start(jobId, 'parse')
			try {
				const res = await previewParseStep.run({ filePath: input.filePath, pieces }, ctx)
				if (res.status === 'skipped') {
					await progress.skip(jobId, 'parse', res.message || 'skipped')
					throw new Error('Preview parse step was skipped unexpectedly')
				}
				await progress.complete(jobId, 'parse')
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
			} catch (err) {
				await progress.fail(jobId, 'parse', err)
				throw err
			} finally {
				if (logger instanceof PhaseLogger) {
					logger.clearActivePhase()
				}
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

		// Use run.id (UUID) for isolating preview files on disk
		const outDir = path.join(path.dirname(config.paths.assets), 'previews', run.id)
		const transforms: PreviewAsset[] = []
		const priorAssets: PublicWebPieceAsset[] = []

		// 2. Run preview transforms sequentially
		for (const name of PREVIEW_TRANSFORM_NAMES) {
			try {
				const records = await step.run({ name: `transform-${name}` }, async () => {
					if (logger instanceof PhaseLogger) {
						logger.setActivePhase({ jobId, phase: name })
					}
					await progress.start(jobId, name)
					try {
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
							await progress.skip(jobId, name, res.message || 'skipped')
							return []
						}
						await progress.complete(jobId, name, `${res.value.length} record(s)`)
						return res.value
					} catch (err) {
						await progress.fail(jobId, name, err)
						throw err
					} finally {
						if (logger instanceof PhaseLogger) {
							logger.clearActivePhase()
						}
					}
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

		logger.info('openworkflow preview complete', { filePath: input.filePath, jobId, runId: run.id })

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
