import type { Kysely} from 'kysely';
import { Migrator, type MigrationResultSet } from 'kysely'
import { migrations } from './migrations/index.js'

export async function runWebMigrations<T>(db: Kysely<T>): Promise<MigrationResultSet> {
	const migrator = new Migrator({
		db,
		provider: { getMigrations: async () => migrations },
		migrationTableName: 'kysely_web_migrations',
		migrationLockTableName: 'kysely_web_migrations_lock'
	})
	return migrator.migrateToLatest()
}
