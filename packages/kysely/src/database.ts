import { Kysely, SqliteDialect } from 'kysely'
import SqliteDatabase from 'better-sqlite3'
import { LuzzleTables } from './database.schema.js'

function getDatabaseClient(pathToDb: string, debug = false) {
	return new Kysely<LuzzleTables>({
		log: debug ? ['query', 'error'] : [],
		dialect: new SqliteDialect({
			database: new SqliteDatabase(pathToDb),
		}),
	})
}

export { getDatabaseClient }
