import { PieceCommonDatabaseFields } from './common.js'

type PiecesItemsTable = {
	[key in string]: number | string | null
} & PieceCommonDatabaseFields

/* c8 ignore next */
export { type PiecesItemsTable, type PieceCommonDatabaseFields }
