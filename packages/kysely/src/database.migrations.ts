import { MigrationProvider, MigrationResultSet, Migrator } from 'kysely'
import { LuzzleDatabase } from './database.schema'
import * as migration1 from './migrations/2023-05-26T15:04:19.094Z'
import * as migration2 from './migrations/2023-10-30T23:24:40Z'
import * as migration3 from './migrations/2023-11-22T14:55:18Z'
import * as migration4 from './migrations/2023-11-27T04:32:07Z'
import * as migration5 from './migrations/2024-01-01T23:30:29Z'
import * as migration6 from './migrations/2024-01-06T15:52:43Z'

class LuzzleMigrationProvider implements MigrationProvider {
	async getMigrations() {
		return {
			'1': migration1,
			'2': migration2,
			'3': migration3,
			'4': migration4,
			'5': migration5,
			'6': migration6,
		}
	}
}

export default async function (db: LuzzleDatabase): Promise<MigrationResultSet> {
	const luzzleMigrationProvider = new LuzzleMigrationProvider()
	const migrator = new Migrator({ db, provider: luzzleMigrationProvider })
	const results = await migrator.migrateToLatest()

	return results
}
