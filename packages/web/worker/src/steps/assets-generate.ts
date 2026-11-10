import { Pieces, StorageFileSystem } from '@luzzle/core'
import type { PublishPieceFailure } from '@luzzle/web.jobs'
import type { Kysely } from 'kysely'
import { completed, type Step, type StepResult } from '../core/step.js'
import type { WebDatabase } from '../services/db.js'
import { produceTransformsForPiece, persistTransforms } from '../transforms/runner.js'
import { cleanupAllTransforms } from '../transforms/index.js'
import type { PreparedPublication } from './web-sync/index.js'

export interface AssetsGenerateResult {
	filePaths: string[]
	failedPieces: PublishPieceFailure[]
}

export const assetsGenerateStep: Step<PreparedPublication[], AssetsGenerateResult> = {
	name: 'assets.generate',
	async run(prepared, ctx): Promise<StepResult<AssetsGenerateResult>> {
		const { db, config, logger } = ctx
		const filePaths = new Set<string>()
		const failedPieces: PublishPieceFailure[] = []

		logger.info('assets.generate starting', { count: prepared.length })

		try {
			if (prepared.length > 0) {
				const pieces = new Pieces(new StorageFileSystem(config.storage.root))

				for (const { webPiece, assetKeyToPath } of prepared) {
					try {
						logger.info(`assets.generate running transforms: ${webPiece.file_path}`)
						const produced = await produceTransformsForPiece(
							webPiece,
							config,
							config.paths.assets,
							pieces,
							{},
							new Map(assetKeyToPath),
							logger
						)
						await persistTransforms(
							db as unknown as Kysely<WebDatabase>,
							webPiece,
							config,
							produced
						)

						for (const { records } of produced) {
							for (const record of records) {
								if (record.asset_path && !record.is_embedded) filePaths.add(record.asset_path)
							}
						}
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error)
						failedPieces.push({ filePath: webPiece.file_path, message })
						logger.error(`assets.generate failed for ${webPiece.file_path}`, { message })
					}
				}
			}
		} finally {
			await cleanupAllTransforms()
		}

		if (failedPieces.length > 0) {
			logger.warn('assets.generate complete with failures', {
				failedCount: failedPieces.length,
				count: prepared.length,
			})
		} else {
			logger.info('assets.generate complete')
		}
		return completed({ filePaths: [...filePaths], failedPieces })
	},
}
