import Piece from './piece.js'
import { readdir } from 'fs/promises'

class Pieces {
	private _directory: string

	constructor(dir: string) {
		this._directory = dir
	}

	get directory() {
		return this._directory
	}

	async getPiece(name: string) {
		return new Piece(this._directory, name)
	}

	async findPieceNames() {
		const dirs = await readdir(this._directory, { withFileTypes: true })
		return dirs
			.filter((dir) => dir.isDirectory() && !dir.name.startsWith('.'))
			.map((dir) => dir.name)
	}
}

export default Pieces
