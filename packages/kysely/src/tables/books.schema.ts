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
	year_first_published: number | null
	date_read: number | null
	cover: string | null
} & PieceCommonFields

type BookSelectable = Selectable<BooksTable>
type BookInsertable = Insertable<BooksTable>
type BookUpdateable = Updateable<BooksTable>

export { type BooksTable, type BookSelectable, type BookInsertable, type BookUpdateable }
