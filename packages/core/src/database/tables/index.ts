import { Kysely, Insertable, Updateable, Selectable } from 'kysely'
import { CacheTable } from './pieces_cache.schema.js'
import { PieceManager } from './pieces_manager.schema.js'

const LuzzleTableName = {
	Cache: 'pieces_cache',
	PieceManager: 'pieces_manager',
} as const

type LuzzleTables = {
	[LuzzleTableName.Cache]: CacheTable
	[LuzzleTableName.PieceManager]: PieceManager
}

type LuzzleDatabase = Kysely<LuzzleTables>
type LuzzleTableNames = (typeof LuzzleTableName)[keyof typeof LuzzleTableName]
type LuzzleTable<T extends LuzzleTableNames> = LuzzleTables[T]

type LuzzleInsertable<T extends LuzzleTableNames> = Insertable<LuzzleTable<T>>
type LuzzleUpdatable<T extends LuzzleTableNames> = Updateable<LuzzleTable<T>>
type LuzzleSelectable<T extends LuzzleTableNames> = Selectable<LuzzleTable<T>>

export {
	type LuzzleTables,
	type LuzzleDatabase,
	type LuzzleInsertable,
	type LuzzleUpdatable,
	type LuzzleSelectable,
	type LuzzleTableNames,
	LuzzleTableName,
}
