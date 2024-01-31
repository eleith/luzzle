import type { Insertable, Updateable, Selectable } from 'kysely'
import type { PieceCommonFields } from '../database.utils.js'

const LinkType = {
	Bookmark: 'bookmark',
	Article: 'article',
} as const

type LinkTypes = (typeof LinkType)[keyof typeof LinkType]

type LinksTable = {
	title: string
	subtitle: string | null
	author: string | null
	coauthors: string | null
	summary: string | null
	date_accessed: number | null
	date_published: number | null
	archive_path: string | null
	url: string
	is_active: number
	is_paywall: number
	archive_url: string | null
	representative_image: string | null
	type: LinkTypes
	word_count: number | null
} & PieceCommonFields

type LinkSelectable = Selectable<LinksTable>
type LinkInsertable = Insertable<LinksTable>
type LinkUpdateable = Updateable<LinksTable>

export {
	LinkType,
	type LinkTypes,
	type LinksTable,
	type LinkSelectable,
	type LinkInsertable,
	type LinkUpdateable,
}
