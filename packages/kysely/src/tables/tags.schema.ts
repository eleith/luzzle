import type { Insertable, Updateable, Selectable } from 'kysely'
import { cuid, date_added, date_updated } from '../database/utils.js'

interface TagsTable {
	id: cuid
	slug: string
	name: string
	date_added: date_added
	date_updated: date_updated
}

type Tag = Selectable<TagsTable>
type TagInsert = Insertable<TagsTable>
type TagUpdate = Updateable<TagsTable>

export { type TagsTable, type Tag, type TagInsert, type TagUpdate }
