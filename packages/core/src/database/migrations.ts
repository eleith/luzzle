import { FileMigrationProvider, MigrationResultSet, Migrator } from 'kysely'
import { LuzzleDatabase } from './tables/index.js'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default async function (db: LuzzleDatabase): Promise<MigrationResultSet> {
	const provider = new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.join(dirname, './migrations'),
	})
	const migrator = new Migrator({ db, provider })

	return migrator.migrateToLatest()
}
