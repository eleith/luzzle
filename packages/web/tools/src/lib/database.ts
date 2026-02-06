import { getDatabaseClient, migrate } from '@luzzle/core'
import { Config } from '@luzzle/web.utils'
import path from 'path'

export function getDatabase(config: Config) {
	if (!config.paths.config) {
		throw new Error('Config path is missing. Database cannot be resolved.')
	}

	const dbPath = path.resolve(path.dirname(config.paths.config), config.paths.database)
	return getDatabaseClient(dbPath)
}

export async function getDatabaseAndMigrate(config: Config) {
	const db = getDatabase(config)

	const migrationStatus = await migrate(db)

	if (migrationStatus.error) {
		throw new Error(`Migration failed: ${migrationStatus.error}`)
	}

	return db
}
