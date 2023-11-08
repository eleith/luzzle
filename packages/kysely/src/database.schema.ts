import type { ColumnType, Insertable, Updateable, Selectable, Kysely } from 'kysely'

type cuid = string
type date_added = ColumnType<number, undefined, never>
type date_updated = ColumnType<number | null, undefined, number>
type PieceCommonFields = { note: string | null; id: string; slug: string; keywords: string | null }

const LuzzlePieceType = {
	Book: 'books',
	Link: 'links',
} as const

type LuzzlePieceTypes = typeof LuzzlePieceType[keyof typeof LuzzlePieceType]

const LinkType = {
	Bookmark: 'bookmark',
	Article: 'article',
} as const

type LinkTypes = typeof LinkType[keyof typeof LinkType]

interface LinksTable {
	id: cuid
	title: string
	subtitle: string | null
	author: string | null
	coauthors: string | null
	summary: string | null
	date_accessed: number | null
	date_published: number | null
	date_added: date_added
	date_updated: date_updated
	keywords: string | null
	slug: string
	note: string | null
	archive_path: string | null
	url: string
	active: boolean
	archive_url: string | null
	screenshot_path: string | null
	type: LinkTypes
}

interface BooksTable {
	id: cuid
	id_ol_book: string | null
	id_ol_work: string | null
	isbn: string | null
	title: string
	subtitle: string | null
	author: string
	coauthors: string | null
	description: string | null
	pages: number | null
	year_read: number | null
	month_read: number | null
	year_first_published: number | null
	date_added: date_added
	date_updated: date_updated
	keywords: string | null
	cover_width: number | null
	cover_height: number | null
	cover_path: string | null
	slug: string
	note: string | null
	read_order: string
}

interface TagMapsTable {
	id_tag: cuid
	id_item: cuid
	type: LuzzlePieceTypes
	date_added: date_added
	date_updated: date_updated
}

interface TagsTable {
	id: cuid
	slug: string
	name: string
	date_added: date_added
	date_updated: date_updated
}

const PieceTable = {
	Books: LuzzlePieceType.Book,
	Links: LuzzlePieceType.Link,
} as const

interface DatabasePieceTables {
	[PieceTable.Books]: BooksTable
	[PieceTable.Links]: LinksTable
}

type LuzzleTables = {
	tag_maps: TagMapsTable
	tags: TagsTable
} & DatabasePieceTables

type LuzzleDatabase = Kysely<LuzzleTables>
type LuzzlePieceTable<P extends keyof DatabasePieceTables> = DatabasePieceTables[P] &
	PieceCommonFields

type Book = Selectable<BooksTable>
type BookInsert = Insertable<BooksTable>
type BookUpdate = Updateable<BooksTable>

type Tag = Selectable<TagsTable>
type TagInsert = Insertable<TagsTable>
type TagUpdate = Updateable<TagsTable>

type TagMap = Selectable<TagMapsTable>
type TagMapInsert = Insertable<TagMapsTable>
type TagMapUpdate = Updateable<TagMapsTable>

type Link = Selectable<LinksTable>
type LinkInsert = Insertable<LinksTable>
type LinkUpdate = Updateable<LinksTable>

type PieceTables = keyof DatabasePieceTables & string
type Pieces = DatabasePieceTables[PieceTables]

export {
	type cuid,
	type date_added,
	type date_updated,
	type LinksTable,
	type BooksTable,
	type TagMapsTable,
	type TagsTable,
	type LuzzleTables,
	type LuzzleDatabase,
	type LuzzlePieceTypes,
	type Book,
	type BookInsert,
	type BookUpdate,
	type Tag,
	type TagInsert,
	type TagUpdate,
	type TagMap,
	type TagMapInsert,
	type TagMapUpdate,
	type Link,
	type LinkInsert,
	type LinkUpdate,
	type LinkTypes,
	type PieceTables,
	type Pieces,
	PieceTable,
	LuzzlePieceType,
	LinkType,
	type PieceCommonFields,
	type LuzzlePieceTable,
}
