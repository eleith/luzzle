import { ColumnType } from 'kysely'

type cuid = string
type date_added = ColumnType<number, undefined, never>
type date_updated = ColumnType<number | null, undefined, number>

type SchemaDateStringToDatabaseNumber<T> = {
	[K in keyof T]: K extends `date_${string}` ? number : T[K] extends number ? string : T[K]
}

export { type cuid, type date_updated, type date_added, type SchemaDateStringToDatabaseNumber }
