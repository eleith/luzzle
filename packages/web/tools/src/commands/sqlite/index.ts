import { generateWebSqlite as generateWebSqliteDb } from './database.js'
import { Config } from '@luzzle/web.utils'
import { getDatabase } from '../../lib/database.js'

type GenerateSqliteOptions = {
	archiveDir?: string
	outDir: string
}

export default async function generateWebSqlite(options: GenerateSqliteOptions, config: Config) {
	const db = getDatabase(config)
	await generateWebSqliteDb(db, config, options.outDir)
}
