import { PieceCommonDatabaseFields } from './common.js'

type PiecesItemsTable = {
	[key in string]: number | string | null
} & PieceCommonDatabaseFields

export { type PiecesItemsTable, type PieceCommonDatabaseFields }
