import { generateWebSqlite } from './database.js'
import { Config } from '@luzzle/web.utils'
import { getDatabase } from '../../lib/database.js'

export default async function generateWebSqliteCommand(config: Config) {
	const db = getDatabase(config)
	const result = await generateWebSqlite(db)

	if (result.error) {
		throw new Error(`Web migration failed: ${result.error}`)
	}
}
