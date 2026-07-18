import type { Kysely} from 'kysely';
import { type Insertable, type Updateable, type Selectable } from 'kysely'
import type { CacheTable } from './pieces_cache.schema.js'
import type { PieceManagerTable } from './pieces_manager.schema.js'
import type { PiecesItemsTable } from './pieces_items.schema.js'

const LuzzleTableName = {
	Cache: 'pieces_cache',
	PieceManager: 'pieces_manager',
	PieceItems: 'pieces_items',
} as const

type LuzzleTables = {
	[LuzzleTableName.Cache]: CacheTable
	[LuzzleTableName.PieceManager]: PieceManagerTable
	[LuzzleTableName.PieceItems]: PiecesItemsTable
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
