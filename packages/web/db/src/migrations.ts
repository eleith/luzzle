import { FileMigrationProvider, Kysely, Migrator, type MigrationResultSet } from 'kysely'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function runWebMigrations<T>(db: Kysely<T>): Promise<MigrationResultSet> {
	const provider = new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.join(import.meta.dirname, './migrations')
	})
	const migrator = new Migrator({
		db,
		provider,
		migrationTableName: 'kysely_web_migrations',
		migrationLockTableName: 'kysely_web_migrations_lock'
	})
	return migrator.migrateToLatest()
}
