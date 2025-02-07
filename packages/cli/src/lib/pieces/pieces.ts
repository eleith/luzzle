import Piece from './piece.js'
import path from 'path'
import { PieceFileType } from './utils.js'
import { ASSETS_DIRECTORY, LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY } from '../assets.js'
import {
	LuzzleDatabase,
	addPiece,
	deletePiece,
	getPiece,
	getPieces,
	jsonToPieceSchema,
	updatePiece,
} from '@luzzle/core'
import log from '../log.js'
import { stat } from 'fs/promises'
import { Storage } from '../storage/index.js'

class Pieces {
	private _storage: Storage

	constructor(storage: Storage) {
		this._storage = storage
	}

	async getPiece(name: string) {
		const schema = await this.getSchema(name)
		return new Piece(name, this._storage, schema)
	}

	getSchemaPath(name: string) {
		return path.join(LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY, `${name}.json`)
	}

	async getSchema(name: string) {
		const schemaPath = this.getSchemaPath(name)
		const schemaJson = await this._storage.readFile(schemaPath, 'text')
		return jsonToPieceSchema(schemaJson)
	}

	async sync(db: LuzzleDatabase, dryRun: boolean) {
		const names = await this.getTypes()

		for (const name of names) {
			const piece = await getPiece(db, name)
			const schema = await this.getSchema(name)
			const schemaPath = this.getSchemaPath(name)
			const fileStat = await stat(schemaPath).catch(() => null)

			if (!fileStat) {
				throw new Error(`schema file ${schemaPath} not found`)
			}

			if (!piece) {
				if (!dryRun) {
					await addPiece(db, name, schema)
				}
				log.info(`Added piece ${name} from schema at ${schemaPath}`)
			} else {
				const pieceDate = piece.date_updated || piece.date_added

				if (fileStat.mtime > new Date(pieceDate)) {
					if (!dryRun) {
						await updatePiece(db, name, schema)
					}
					log.info(`Updated piece ${name} from schema at ${schemaPath}`)
				}
			}
		}

		return names
	}

	async prune(db: LuzzleDatabase, dryRun = false) {
		const names = await this.getTypes()
		const dbPieces = await getPieces(db)
		const diskPiecesSet = new Set<string>(names)
		const missingPieces = dbPieces
			.filter((piece) => !diskPiecesSet.has(piece.name))
			.map((piece) => piece.name)

		for (const name of missingPieces) {
			if (!dryRun) {
				await deletePiece(db, name)
			}
			log.info(`pruned piece type (db): ${name}`)
		}
	}

	getTypeFromFile(file: string) {
		const name = path.basename(file)
		const parts = name.split('.')

		return parts.length === 3 ? parts[1] : null
	}

	async getSchemas() {
		const schemaDir = path.join(LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY)
		const readDir = await this._storage.readdir(schemaDir)

		return readDir.filter((file) => path.extname(file) === `.json`)
	}

	async getTypes() {
		const schemas = await this.getSchemas()

		return schemas.map((schema) => path.basename(schema, '.json'))
	}

	async getFiles() {
		const types = await this.getTypes()
		const readdir = await this._storage.readdir('.')
		const files: { pieces: { [key: string]: string[] }; assets: string[] } = {
			pieces: {},
			assets: [],
		}

		types.forEach((type) => {
			files.pieces[type] = []
		})

		readdir.reduce((files, file) => {
			const extension = path.extname(file)
			const isAsset = file.startsWith(ASSETS_DIRECTORY)
			const isHidden = file.startsWith('.')

			if (isAsset) {
				files.assets.push(file)
			} else if (!isHidden) {
				const type = this.getTypeFromFile(file)
				const isMarkdown = extension === `.${PieceFileType}`

				if (type && types.includes(type) && isMarkdown) {
					files.pieces[type].push(file)
				}
			}

			return files
		}, files)

		return files
	}
}

export default Pieces
