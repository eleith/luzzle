import { Insertable, Updateable, Selectable } from 'kysely'
import { PiecesItemsTable } from './types/index.js'

type PiecesItemsInsertable = Insertable<PiecesItemsTable>
type PiecesItemsSelectable = Selectable<PiecesItemsTable>
type PiecesItemsUpdateable = Updateable<PiecesItemsTable>

export { type PiecesItemsInsertable, type PiecesItemsSelectable, type PiecesItemsUpdateable }
