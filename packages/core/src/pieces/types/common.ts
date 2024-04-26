import { date_added, date_updated } from '../../database/utils.js'

const PieceCommonDatabaseFieldNames = ['note', 'slug', 'id', 'date_added', 'date_updated']

type PieceCommonDatabaseFields = {
	note: string | null
	slug: string
	id: string
	date_added: date_added
	date_updated: date_updated
}

export { type PieceCommonDatabaseFields, PieceCommonDatabaseFieldNames }
