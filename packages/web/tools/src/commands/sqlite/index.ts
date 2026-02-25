import { generateWebSqlite as generateWebSqliteDb } from './database.js'
import { Config } from '@luzzle/web.utils'
import { getDatabase } from '../../lib/database.js'

export default async function generateWebSqlite(config: Config) {
	const db = getDatabase(config)
	await generateWebSqliteDb(db, config)
}
