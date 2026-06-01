import type { Insertable, Updateable, Selectable } from 'kysely'
import { cuid, date_added, date_updated } from '../utils.js'

interface PieceManagerTable {
	id: cuid
	date_added: date_added
	date_updated?: date_updated
	name: string
	schema: string
}

type PieceManagerSelect = Selectable<PieceManagerTable>
type PieceManagerInsert = Insertable<PieceManagerTable>
type PieceManagerUpdate = Updateable<PieceManagerTable>

export {
	type PieceManagerTable,
	type PieceManagerSelect,
	type PieceManagerInsert,
	type PieceManagerUpdate,
}
