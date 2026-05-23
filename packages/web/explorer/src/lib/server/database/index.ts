import { building } from '$app/environment'
import { config } from '$lib/server/config'
import { sql } from '@luzzle/core'
import { runWebMigrations, createAppDb } from '@luzzle/web.db'
import type { WebDatabase } from '@luzzle/web.db'

export type { JobProgressRow, JobProgressLogsRow } from '@luzzle/web.db'

const dbPath = building ? ':memory:' : config.paths.database
const db = createAppDb(dbPath)

if (!building) {
	const result = await runWebMigrations(db)
	if (result.error) {
		throw new Error(`Web migrations failed: ${result.error}`)
	}
}

export { sql, db }
export type { WebDatabase }
