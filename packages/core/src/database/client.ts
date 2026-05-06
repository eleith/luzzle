import { Kysely } from 'kysely'
import { NodeSqliteDialect } from './NodeSqliteDialect.js'
import { DatabaseSync } from 'node:sqlite'
import { LuzzleTables } from './tables/index.js'

function getDatabaseClient(pathToDb: string, debug = false) {
	return new Kysely<LuzzleTables>({
		log: debug ? ['query', 'error'] : [],
		dialect: new NodeSqliteDialect({
			database: new DatabaseSync(pathToDb),
		}),
	})
}

export { getDatabaseClient }
