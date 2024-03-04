import { FileMigrationProvider, MigrationResultSet, Migrator } from 'kysely'
import { LuzzleDatabase } from './schema.js'
import { promises as fs } from 'fs'
import path from 'path'

export default async function (db: LuzzleDatabase): Promise<MigrationResultSet> {
	const provider = new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.join(__dirname, 'migrations'),
	})
	const migrator = new Migrator({ db, provider })

	return migrator.migrateToLatest()
}
