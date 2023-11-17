import type { Insertable, Updateable, Selectable } from 'kysely'
import type { PieceCommonFields } from '../database.utils.js'

type BooksTable = {
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
	cover_width: number | null
	cover_height: number | null
	cover_path: string | null
	read_order: string
} & PieceCommonFields

type BookSelectable = Selectable<BooksTable>
type BookInsertable = Insertable<BooksTable>
type BookUpdateable = Updateable<BooksTable>

export { type BooksTable, type BookSelectable, type BookInsertable, type BookUpdateable }
