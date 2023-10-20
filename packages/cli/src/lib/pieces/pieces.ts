import { existsSync, mkdirSync } from 'fs'
import log from '../log.js'
import { PieceSelectable, PieceTable, PieceTables } from '@luzzle/kysely'
import { PieceMarkDown } from './markdown.js'
import { PieceType, PieceTypes, PieceDirectory } from './utils.js'
import Piece, { InterfacePiece } from './piece.js'

type LuzzlePiece = InterfacePiece<
	PieceTypes,
	PieceSelectable,
	PieceMarkDown<PieceSelectable, keyof PieceSelectable>
>

class Pieces {
	private _directory: string

	constructor(dir: string) {
		this._directory = dir
	}

	get directory() {
		return this._directory
	}

	register<P extends PieceTypes, T extends PieceSelectable, M extends PieceMarkDown<T, keyof T>>(
		PieceInterface: InterfacePiece<P, T, M>
	): Piece<P, T, M> {
		const pieceType = new PieceInterface(this._directory)

		if (!existsSync(this._directory)) {
			mkdirSync(this._directory, { recursive: true })
			log.info(`created luzzle directory ${this._directory}`)
		}

		Object.values(PieceDirectory).forEach((key) => {
			const dir = pieceType.directories[key]
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true })
				log.info(`created luzzle ${pieceType.table} ${key} directory: ${dir}`)
			}
		})

		return pieceType
	}

	/* c8 ignore next 3 */
	getPieceTypes(): PieceTables[] {
		return Object.values(PieceType)
	}

	async getPiece(pieceType: PieceTypes): Promise<InstanceType<typeof Piece>> {
		const pieceTypes = Object.values(PieceTable)
		if (pieceTypes.includes(pieceType)) {
			const LuzzePiecePath = `../../pieces/${PieceType.Books}/piece.js`
			const LuzzlePiece = (await import(LuzzePiecePath)).default as LuzzlePiece
			return this.register(LuzzlePiece)
		}

		throw new Error(`unknown piece type ${pieceType}`)
	}
}

export default Pieces
