import { getDatabaseClient } from './database'
import { LuzzleDatabase } from './database.schema'
import migrate from './database.migrations'
import type { Insertable, Updateable, Selectable } from 'kysely'
import {
	Book,
	BookInsert,
	BookUpdate,
	BooksTable,
	Tag,
	TagInsert,
	TagUpdate,
	TagsTable,
	TagMap,
	TagMapInsert,
	TagMapUpdate,
	TagMapsTable,
	PieceTables,
	Pieces,
	PieceTable,
} from './database.schema'

export {
	type Book,
	type BookInsert,
	type BookUpdate,
	type BooksTable,
	type Tag,
	type TagInsert,
	type TagUpdate,
	type TagsTable,
	type TagMap,
	type TagMapInsert,
	type TagMapUpdate,
	type TagMapsTable,
	type PieceTables,
	type Pieces,
	PieceTable,
}

export type PieceInsertable = Insertable<Pieces>
export type PieceUpdatable = Updateable<Pieces>
export type PieceSelectable = Selectable<Pieces>

export { getDatabaseClient, type LuzzleDatabase, migrate }
