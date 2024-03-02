import { existsSync, mkdirSync } from 'fs'
import log from '../log.js'
import {
	PieceSelectable,
	Pieces as PieceTypes,
	Piece as PieceType,
	PieceFrontmatterFields,
	PieceFrontmatter,
	LuzzleDatabase,
} from '@luzzle/kysely'
import Piece, { InterfacePiece } from './piece.js'

type LuzzlePiece = InterfacePiece<
	PieceTypes,
	PieceSelectable,
	PieceFrontmatter<Omit<PieceSelectable, keyof PieceSelectable>, void | PieceFrontmatterFields>
>

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

	register<
		P extends PieceTypes,
		T extends PieceSelectable,
		F extends PieceFrontmatter<Omit<T, keyof T>, void | PieceFrontmatterFields>
	>(PieceInterface: InterfacePiece<P, T, F>): Piece<P, T, F> {
		const pieceType = new PieceInterface(this._directory, this._db)

		if (!existsSync(this._directory)) {
			mkdirSync(this._directory, { recursive: true })
			log.info(`created luzzle directory ${this._directory}`)
		}

		return pieceType.initialize()
	}

	/* c8 ignore next 3 */
	getPieceTypes(): PieceTypes[] {
		return Object.values(PieceType)
	}

	async getPiece(pieceType: PieceTypes): Promise<InstanceType<typeof Piece>> {
		const pieceTypes = Object.values(PieceType)
		if (pieceTypes.includes(pieceType)) {
			const LuzzePiecePath = `../../pieces/${pieceType}/piece.js`
			const LuzzlePiece = (await import(LuzzePiecePath)).default as LuzzlePiece
			return this.register(LuzzlePiece)
		}

		throw new Error(`unknown piece type ${pieceType}`)
	}
}

export default Pieces
