import { FileMigrationProvider, Migrator, MigrationResultSet } from 'kysely'
import { LuzzleDatabase } from '@luzzle/core'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default async function runWebMigrations(db: LuzzleDatabase): Promise<MigrationResultSet> {
	const provider = new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.join(dirname, './migrations'),
	})
	const migrator = new Migrator({
		db,
		provider,
		migrationTableName: 'kysely_web_migrations',
		migrationLockTableName: 'kysely_web_migrations_lock',
	})
	return migrator.migrateToLatest()
}
