import type { Insertable, Updateable, Selectable } from 'kysely'
import { cuid, date_added, date_updated } from '../utils.js'

interface PieceManager {
	id: cuid
	date_added: date_added
	date_updated?: date_updated
	name: string
	schema: string
}

type PieceManagerSelect = Selectable<PieceManager>
type PieceManagerInsert = Insertable<PieceManager>
type PieceManagerUpdate = Updateable<PieceManager>

export {
	type PieceManager,
	type PieceManagerSelect,
	type PieceManagerInsert,
	type PieceManagerUpdate,
}
