import type { Insertable, Updateable, Selectable } from 'kysely'
import { cuid, date_added, date_updated } from '../utils.js'
import { Pieces } from '../../pieces/tables.schema.js'

interface TagMapsTable {
	id_tag: cuid
	id_item: cuid
	type: Pieces
	date_added: date_added
	date_updated: date_updated
}

type TagMap = Selectable<TagMapsTable>
type TagMapInsert = Insertable<TagMapsTable>
type TagMapUpdate = Updateable<TagMapsTable>

export { type TagMapsTable, type TagMap, type TagMapInsert, type TagMapUpdate }
