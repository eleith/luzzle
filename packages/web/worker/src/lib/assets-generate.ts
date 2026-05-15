import type { Pieces, LuzzleTables } from '@luzzle/core'
import type { Config } from '@luzzle/web.config'
import type { Kysely } from 'kysely'
import type { Logger } from '../logger.js'
import type { WebDatabase } from '../db.js'
import { runTransformsForPiece } from '../transforms/runner.js'
import { buildAssetMaps } from '../transforms/utils/assets.js'
import { cleanupAllTransforms } from '../transforms/index.js'

type FullDb = Kysely<WebDatabase & LuzzleTables>

export async function runAssetsGenerate(
	db: FullDb,
	pieces: Pieces,
	config: Config,
	logger: Logger,
	filePaths: string[]
): Promise<void> {
	logger.info('assets.generate starting', { count: filePaths.length })

	if (filePaths.length === 0) {
		logger.info('assets.generate complete')
		return
	}

	const outDir = config.paths.assets

	const webPieces = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('file_path', 'in', filePaths)
		.execute()

	for (const webPiece of webPieces) {
		const item = await db
			.selectFrom('pieces_items')
			.select('assets_json_array')
			.where('file_path', '=', webPiece.file_path)
			.executeTakeFirst()

		const { keyToPath } = buildAssetMaps(item?.assets_json_array, config.assets.salt)

		logger.info(`assets.generate running transforms: ${webPiece.file_path}`)
		await runTransformsForPiece(
			db as unknown as Kysely<WebDatabase>,
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
}
