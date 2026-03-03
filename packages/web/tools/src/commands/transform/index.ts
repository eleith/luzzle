import { Pieces } from '@luzzle/core'
import { getStorage } from '../../lib/storage.js'
import { getDatabaseAndMigrate } from '../../lib/database.js'
import { type Config, type WebPieces } from '@luzzle/web.utils'
import runWebMigrations from '../../database/migrations.js'
import { transforms } from '../../lib/transforms/index.js'

type TransformOptions = {
	archiveDir?: string
	outDir: string
	type: string
	file: string
}

export default async function runTransform(options: TransformOptions, config: Config) {
	const transform = transforms.get(options.type)
	if (!transform) {
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

	const webPiece = await db
		.withTables<{ web_pieces: WebPieces }>()
		.selectFrom('web_pieces')
		.selectAll()
		.where('file_path', '=', options.file)
		.executeTakeFirst()

	if (!webPiece) {
		throw new Error(`Web piece not found: ${options.file}`)
	}

	await transform.run({ webPiece, config, outDir: options.outDir, pieces })
	await transform.cleanup?.()
}
