import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import { type Config, type WebPieces } from '@luzzle/web.config'
import runWebMigrations from '../../database/migrations.js'
import { getTransforms, cleanupAllTransforms } from '../../lib/transforms/index.js'
import { runTransformsForPiece } from '../../lib/transforms/runner.js'
import { buildAssetMaps } from '../../lib/transforms/assets.js'

type TransformOptions = {
	archiveDir?: string
	outDir: string
	type?: string
	file?: string
	dryRun?: boolean
}

export default async function runTransform(options: TransformOptions, config: Config) {
	const transforms = getTransforms()
	if (options.type && !transforms.has(options.type)) {
		const valid = [...transforms.keys()].join(', ')
		throw new Error(`Unknown transform type "${options.type}". Valid types: ${valid}`)
	}

	const storage = getStorage(config, options.archiveDir)
	const db = await getDatabaseAndMigrate(config)
	const pieces = new Pieces(storage)

	const webMigrationResult = await runWebMigrations(db)
	if (webMigrationResult.error) {
		throw new Error(`Web migration failed: ${webMigrationResult.error}`)
	}

	if (options.file) {
		const webPiece = await db
			.withTables<{ web_pieces: WebPieces }>()
			.selectFrom('web_pieces')
			.selectAll()
			.where('file_path', '=', options.file)
			.executeTakeFirst()

		if (!webPiece) {
			throw new Error(`Web piece not found: ${options.file}`)
		}

		const item = await db
			.selectFrom('pieces_items')
			.select('assets_json_array')
			.where('file_path', '=', options.file)
			.executeTakeFirst()

		const { keyToPath } = buildAssetMaps(item?.assets_json_array, config.assets.salt)

		await runTransformsForPiece(db, webPiece, config, options.outDir, pieces, {
			typeFilter: options.type,
			dryRun: options.dryRun,
		}, keyToPath)
	} else {
		const webPieces = await db
			.withTables<{ web_pieces: WebPieces }>()
			.selectFrom('web_pieces')
			.selectAll()
			.execute()

		const items = await db
			.selectFrom('pieces_items')
			.select(['file_path', 'assets_json_array'])
			.execute()

		const keyToPathByFile = new Map<string, Map<string, string>>()
		for (const item of items) {
			const { keyToPath } = buildAssetMaps(item.assets_json_array, config.assets.salt)
			keyToPathByFile.set(item.file_path, keyToPath)
		}

		for (const webPiece of webPieces) {
			const keyToPath = keyToPathByFile.get(webPiece.file_path) ?? new Map()
			await runTransformsForPiece(db, webPiece, config, options.outDir, pieces, {
				typeFilter: options.type,
				dryRun: options.dryRun,
			}, keyToPath)
		}
	}

	await cleanupAllTransforms()
}
