import { Kysely } from 'kysely'
import { NodeSqliteDialect } from './NodeSqliteDialect.js'
import { DatabaseSync } from 'node:sqlite'
import type { LuzzleTables } from './tables/index.js'

function getDatabaseClient(pathToDb: string, debug = false) {
	const db = new DatabaseSync(pathToDb)
	db.exec('PRAGMA journal_mode = WAL;')
	db.exec('PRAGMA synchronous = NORMAL;')
	db.exec('PRAGMA busy_timeout = 5000;')

	return new Kysely<LuzzleTables>({
		log: debug ? ['query', 'error'] : [],
		dialect: new NodeSqliteDialect({
			database: db,
		}),
	})
}

export { getDatabaseClient }
