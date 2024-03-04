import { ColumnType } from 'kysely'

type cuid = string
type date_added = ColumnType<number, undefined, never>
type date_updated = ColumnType<number | null, undefined, number>

export { type cuid, type date_updated, type date_added }
