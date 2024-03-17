import {
	Pieces as PieceTypes,
	Piece as PieceType,
	LuzzleDatabase,
	getPieceSchema,
} from '@luzzle/kysely'
import Piece from './piece.js'

class Pieces {
	private _directory: string
	private _db: LuzzleDatabase

	constructor(dir: string, db: LuzzleDatabase) {
		this._directory = dir
		this._db = db
	}

	get directory() {
		return this._directory
	}

	/* c8 ignore next 3 */
	getPieceTypes(): PieceTypes[] {
		return Object.values(PieceType)
	}

	getPiece(pieceType: PieceTypes) {
		const schema = getPieceSchema(pieceType)
		return new Piece(this._directory, pieceType, schema, this._db)
	}
}

export default Pieces
