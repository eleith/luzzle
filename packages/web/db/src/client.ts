import { getDatabaseClient } from '@luzzle/core'
import type { Kysely } from 'kysely'
import type { AppDatabase } from './types.js'

export function createAppDb(dbPath: string): Kysely<AppDatabase> {
	return getDatabaseClient(dbPath).withTables<AppDatabase>()
}
