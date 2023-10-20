import { MigrationProvider, Migrator } from 'kysely'
import { LuzzleDatabase } from './database.schema'
import * as migration1 from './migrations/2023-05-26T15:04:19.094Z'

class LuzzleMigrationProvider implements MigrationProvider {
	async getMigrations() {
		return {
			'1': migration1,
		}
	}
}

export default async function (db: LuzzleDatabase) {
	const luzzleMigrationProvider = new LuzzleMigrationProvider()
	const migrator = new Migrator({ db, provider: luzzleMigrationProvider })

	await migrator.migrateToLatest()
}
