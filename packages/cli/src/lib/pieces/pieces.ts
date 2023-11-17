import { existsSync, mkdirSync } from 'fs'
import log from '../log.js'
import {
	PieceSelectable,
	Pieces as PieceTypes,
	Piece as PieceType,
	PieceMarkdown,
	PieceFrontMatterFields,
} from '@luzzle/kysely'
import Piece, { InterfacePiece } from './piece.js'

type LuzzlePiece = InterfacePiece<
	PieceTypes,
	PieceSelectable,
	PieceMarkdown<PieceSelectable, keyof PieceSelectable, PieceFrontMatterFields>
>

class Pieces {
	private _directory: string

	constructor(dir: string) {
		this._directory = dir
	}

	get directory() {
		return this._directory
	}

	register<
		P extends PieceTypes,
		T extends PieceSelectable,
		M extends PieceMarkdown<T, keyof T, PieceFrontMatterFields>
	>(PieceInterface: InterfacePiece<P, T, M>): Piece<P, T, M> {
		const pieceType = new PieceInterface(this._directory)

		if (!existsSync(this._directory)) {
			mkdirSync(this._directory, { recursive: true })
			log.info(`created luzzle directory ${this._directory}`)
		}

		pieceType.initialize()

		return pieceType
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
