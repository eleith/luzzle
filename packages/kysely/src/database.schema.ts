import { Kysely, Insertable, Updateable, Selectable } from 'kysely'
import { TagsTable } from './tables/tags.schema.js'
import { TagMapsTable } from './tables/tag_maps.schema.js'
import { PiecesViewTable } from './tables/pieces.view.schema.js'
import { PieceTables, Piece } from './tables/pieces.js'
import { LinkType as LuzzleLinkType, LinkTypes as LuzzleLinkTypes } from './tables/links.schema.js'

const LuzzleTableViewsName = {
	Pieces: 'pieces',
} as const

const LuzzleTableName = {
	Tags: 'tags',
	TagMaps: 'tag_maps',
	PiecesView: 'pieces_view',
	...Piece,
} as const

type LuzzleTables = {
	[LuzzleTableName.TagMaps]: TagMapsTable
	[LuzzleTableName.Tags]: TagsTable
	[LuzzleTableName.PiecesView]: PiecesViewTable
} & PieceTables

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
	type LuzzleLinkTypes,
	LuzzleTableName,
	LuzzleLinkType,
	LuzzleTableViewsName,
}
