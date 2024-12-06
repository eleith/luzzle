import { fdir } from 'fdir'
import Piece from './piece.js'
import path from 'path'
import { PieceFileType } from './utils.js'
import { LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY } from '../assets.js'

class Pieces {
	private _directory: string

	constructor(dir: string) {
		this._directory = dir
	}

	get directory() {
		return this._directory
	}

	getPiece(name: string) {
		return new Piece(this._directory, name)
	}

	getTypeFromFile(file: string) {
		const name = path.basename(file)
		const parts = name.split('.')

		const fullPath = path.join(this._directory, file)
		const relPath = path.relative(this._directory, fullPath)
		const dir = path.dirname(relPath)

		return parts.length === 3 ? parts[1] : null || dir
	}

	async getTypes() {
		const schemaDir = path.join(this._directory, LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY)
		const crawler = new fdir().withRelativePaths().crawl(schemaDir).sync()
		const schemas = crawler.filter((file) => path.extname(file) === `.json`)

		return schemas.map((schema) => path.basename(schema, '.json'))
	}

	async getFiles(): Promise<string[]> {
		const types = await this.getTypes()
		const crawler = new fdir().withRelativePaths().withDirs().crawl(this._directory).sync()

		return crawler.filter((file) => {
			const extension = path.extname(file)
			const type = this.getTypeFromFile(file)

			return type && types.includes(type) && extension === `.${PieceFileType}`
		})
	}
}

export default Pieces
