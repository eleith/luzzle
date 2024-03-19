import type { Insertable, Updateable, Selectable } from 'kysely'
import type { PieceCommonFields } from '../../tables.schema.js'

type TextsTable = {
	title: string
	subtitle: string | null
	summary: string | null
	date_published: number | null
	representative_image: string | null
	attachments: string | null
} & PieceCommonFields

type TextSelectable = Selectable<TextsTable>
type TextInsertable = Insertable<TextsTable>
type TextUpdateable = Updateable<TextsTable>

export { type TextsTable, type TextSelectable, type TextInsertable, type TextUpdateable }
