import { ColumnType } from 'kysely'

type cuid = string
type date_added = ColumnType<number, undefined, never>
type date_updated = ColumnType<number | null, undefined, number>

type PieceCommonFields = {
	note: string | null
	id: string
	slug: string
	keywords: string | null
	date_added: date_added
	date_updated: date_updated
}

export { type cuid, type date_updated, type date_added, type PieceCommonFields }
