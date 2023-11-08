import { getDatabaseClient } from './database'
import migrate from './database.migrations'
import type { Insertable, Updateable, Selectable } from 'kysely'
import {
	Link,
	LinkInsert,
	LinkUpdate,
	LinksTable,
	LinkType,
	LinkTypes,
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
	LuzzleTables,
	LuzzleDatabase,
	LuzzlePieceTypes,
	LuzzlePieceType,
	LuzzlePieceTable,
	PieceCommonFields,
} from './database.schema'

export {
	type Link,
	type LinkInsert,
	type LinkUpdate,
	type LinksTable,
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
	type LuzzleDatabase,
	type LuzzlePieceTypes,
	type LinkTypes,
	type PieceCommonFields,
	type LuzzlePieceTable,
	type LuzzleTables,
	PieceTable,
	LinkType,
	LuzzlePieceType,
	getDatabaseClient,
	migrate,
}

export type PieceInsertable<
	P extends LuzzlePieceTable<PieceTables> = LuzzlePieceTable<PieceTables>
> = Insertable<P>
export type PieceUpdatable<
	P extends LuzzlePieceTable<PieceTables> = LuzzlePieceTable<PieceTables>
> = Updateable<P>
export type PieceSelectable<
	P extends LuzzlePieceTable<PieceTables> = LuzzlePieceTable<PieceTables>
> = Selectable<P>
