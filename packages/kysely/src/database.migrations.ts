import { MigrationProvider, Migrator } from 'kysely'
import { LuzzleDatabase } from './database.schema'
import * as migration1 from './migrations/2023-05-26T15:04:19.094Z'
import * as migration2 from './migrations/2023-10-30T23:24:40Z'
import * as migration3 from './migrations/2023-11-22T14:55:18Z'

class LuzzleMigrationProvider implements MigrationProvider {
	async getMigrations() {
		return {
			'1': migration1,
			'2': migration2,
			'3': migration3,
		}
	}
}

export default async function (db: LuzzleDatabase) {
	const luzzleMigrationProvider = new LuzzleMigrationProvider()
	const migrator = new Migrator({ db, provider: luzzleMigrationProvider })

	await migrator.migrateToLatest()
}
