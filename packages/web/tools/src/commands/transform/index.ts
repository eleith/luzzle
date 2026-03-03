import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import { type Config, type WebPieces } from '@luzzle/web.utils'
import runWebMigrations from '../../database/migrations.js'
import { transforms, cleanupAllTransforms } from '../../lib/transforms/index.js'
import { runTransformsForPiece } from '../../lib/transforms/runner.js'

type TransformOptions = {
	archiveDir?: string
	outDir: string
	type?: string
	file?: string
	dryRun?: boolean
}

export default async function runTransform(options: TransformOptions, config: Config) {
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

		await runTransformsForPiece(db, webPiece, config, options.outDir, pieces, {
			typeFilter: options.type,
			dryRun: options.dryRun,
		})
	} else {
		const webPieces = await db
			.withTables<{ web_pieces: WebPieces }>()
			.selectFrom('web_pieces')
			.selectAll()
			.execute()

		for (const webPiece of webPieces) {
			await runTransformsForPiece(db, webPiece, config, options.outDir, pieces, {
				typeFilter: options.type,
				dryRun: options.dryRun,
			})
		}
	}

	await cleanupAllTransforms()
}
