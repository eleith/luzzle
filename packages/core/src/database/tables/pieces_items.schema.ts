import type { Insertable, Updateable, Selectable } from 'kysely'
import { cuid, date_added, date_updated } from '../utils.js'

interface PiecesItemsTable {
	id: cuid
	file_path: string
	type: string
	date_added: date_added
	date_updated: date_updated
	note_markdown: string
	frontmatter_json: string
}

type PiecesItemsSelectable = Selectable<PiecesItemsTable>
type PiecesItemsInsertable = Insertable<PiecesItemsTable>
type PiecesItemsUpdateable = Updateable<PiecesItemsTable>

export {
	type PiecesItemsTable,
	type PiecesItemsSelectable,
	type PiecesItemsInsertable,
	type PiecesItemsUpdateable,
}
