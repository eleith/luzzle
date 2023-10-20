import { Kysely, SqliteDialect } from 'kysely'
import SqliteDatabase from 'better-sqlite3'
import { Database } from './database.schema'

function getDatabaseClient(pathToDb: string, debug = false) {
	return new Kysely<Database>({
		log: debug ? ['query', 'error'] : [],
		dialect: new SqliteDialect({
			database: new SqliteDatabase(pathToDb),
		}),
	})
}

export { getDatabaseClient }
