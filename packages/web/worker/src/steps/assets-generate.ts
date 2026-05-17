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

type FullDb = Kysely<WebDatabase & LuzzleTables>

export const assetsGenerateStep: Step<AssetsGenerateInput, void> = {
	name: 'assets.generate',
	async run({ filePaths }, ctx): Promise<StepResult<void>> {
		const { db, config, logger } = ctx
		const fullDb = db as unknown as FullDb

		logger.info('assets.generate starting', { count: filePaths.length })

		if (filePaths.length === 0) {
			logger.info('assets.generate complete')
			return completed(undefined)
		}

		const storage = new StorageFileSystem(config.storage.root)
		const pieces = new Pieces(storage)
		const outDir = config.paths.assets

		const webPieces = await fullDb
			.selectFrom('web_pieces')
			.selectAll()
			.where('file_path', 'in', filePaths)
			.execute()

		for (const webPiece of webPieces) {
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
		}

		await cleanupAllTransforms()

		logger.info('assets.generate complete')
		return completed(undefined)
	},
}
