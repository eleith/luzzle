import type { Insertable, Updateable, Selectable } from 'kysely'
import { cuid, date_added, date_updated } from '../utils.js'

interface CacheTable {
	id: cuid
	file_path: string
	content_hash: string
	date_added: date_added
	date_updated: date_updated
}

type CacheSelectable = Selectable<CacheTable>
type CacheInsert = Insertable<CacheTable>
type CacheUpdate = Updateable<CacheTable>

export { type CacheTable, type CacheSelectable, type CacheInsert, type CacheUpdate }
