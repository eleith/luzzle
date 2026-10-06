import { Pieces, StorageFileSystem, type LuzzleTables } from '@luzzle/core'
import type { Kysely } from 'kysely'
import { completed, type Step, type StepResult } from '../core/step.js'
import type { WebDatabase } from '../services/db.js'
import { runTransformsForPiece } from '../transforms/runner.js'
import { buildAssetMaps } from '../transforms/utils/assets.js'
import { cleanupAllTransforms } from '../transforms/index.js'

export interface AssetsGenerateInput {
	filePaths: string[]
}

export interface AssetsGenerateResult {
	failedPieces: Array<{ filePath: string; message: string }>
}

type FullDb = Kysely<WebDatabase & LuzzleTables>

export const assetsGenerateStep: Step<AssetsGenerateInput, AssetsGenerateResult> = {
	name: 'assets.generate',
	async run({ filePaths }, ctx): Promise<StepResult<AssetsGenerateResult>> {
		const { db, config, logger } = ctx
		const fullDb = db as unknown as FullDb

		logger.info('assets.generate starting', { count: filePaths.length })
		const failedPieces: AssetsGenerateResult['failedPieces'] = []

		if (filePaths.length === 0) {
			logger.info('assets.generate complete')
			return completed({ failedPieces })
		}

		let pieceCount = 0
		try {
			const storage = new StorageFileSystem(config.storage.root)
			const pieces = new Pieces(storage)
			const outDir = config.paths.assets

			const webPieces = await fullDb
				.selectFrom('web_pieces')
				.selectAll()
				.where('file_path', 'in', filePaths)
				.execute()
			pieceCount = webPieces.length

			for (const webPiece of webPieces) {
				try {
					const item = await fullDb
						.selectFrom('pieces_items')
						.select('assets_json_array')
						.where('file_path', '=', webPiece.file_path)
						.executeTakeFirst()

					const { keyToPath } = buildAssetMaps(item?.assets_json_array, config.assets.salt)

					logger.info(`assets.generate running transforms: ${webPiece.file_path}`)
					await runTransformsForPiece(
						fullDb as unknown as Kysely<WebDatabase>,
						webPiece,
						config,
						outDir,
						pieces,
						{},
						keyToPath,
						logger
					)
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					failedPieces.push({ filePath: webPiece.file_path, message })
					logger.error(`assets.generate failed for ${webPiece.file_path}`, { message })
				}
			}
		} finally {
			await cleanupAllTransforms()
		}

		if (failedPieces.length > 0) {
			logger.warn('assets.generate complete with failures', {
				failedCount: failedPieces.length,
				count: pieceCount,
			})
		} else {
			logger.info('assets.generate complete')
		}
		return completed({ failedPieces })
	},
}
