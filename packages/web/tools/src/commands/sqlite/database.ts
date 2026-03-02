import runWebMigrations from '../../database/migrations.js'
import { LuzzleDatabase } from '@luzzle/core'
import { MigrationResultSet } from 'kysely'

export async function generateWebSqlite(db: LuzzleDatabase): Promise<MigrationResultSet> {
	return runWebMigrations(db)
}
