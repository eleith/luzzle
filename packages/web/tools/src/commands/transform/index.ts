import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import { type Config } from '@luzzle/web.utils'
import runWebMigrations from '../../database/migrations.js'
import { transformMap, cleanupTransforms } from '../../lib/transforms/index.js'

type TransformOptions = {
	archiveDir?: string
	outDir: string
	type: string
	file: string
}

export default async function runTransform(options: TransformOptions, config: Config) {
	const transform = transformMap[options.type]
	if (!transform) {
		const valid = Object.keys(transformMap).join(', ')
		throw new Error(`Unknown transform type "${options.type}". Valid types: ${valid}`)
	}

	const storage = getStorage(config, options.archiveDir)
	const db = await getDatabaseAndMigrate(config)
	const pieces = new Pieces(storage)

	const webMigrationResult = await runWebMigrations(db)
	if (webMigrationResult.error) {
		throw new Error(`Web migration failed: ${webMigrationResult.error}`)
	}

	const item = await db
		.selectFrom('pieces_items')
		.selectAll()
		.where('file_path', '=', options.file)
		.executeTakeFirst()

	if (!item) {
		throw new Error(`Piece not found: ${options.file}`)
	}

	await transform.run({ item, config, outDir: options.outDir, pieces, db })
	await cleanupTransforms()
}
