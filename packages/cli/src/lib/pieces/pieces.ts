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

	async getPieceMarkdown(file: string, type?: string) {
		const parts = this.parseFilename(file)
		const pieceName = parts.type || type

		if (pieceName) {
			const piece = await this.getPiece(pieceName)
			return await piece.get(file)
		}

		throw new Error(`invalid piece, can't determine piece type: ${file}`)
	}

	async getPieceAsset(file: string) {
		return await this._storage.readFile(file) as Buffer
	}

	getSchemaPath(name: string) {
		return path.join(LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY, `${name}.json`)
	}

	async getSchema(name: string) {
		const schemaPath = this.getSchemaPath(name)
		const schemaJson = await this._storage.readFile(schemaPath, 'text')
		return jsonToPieceSchema(schemaJson as string)
	}

	async sync(db: LuzzleDatabase, dryRun: boolean) {
		const names = await this.getTypes()

		for (const name of names) {
			const piece = await getPiece(db, name)
			const schemaPath = this.getSchemaPath(name)
			const fileStat = await this._storage.stat(schemaPath).catch(() => null)

			if (!fileStat) {
				throw new Error(`schema file ${schemaPath} not found`)
			}

			const schema = await this.getSchema(name)

			if (!piece) {
				if (!dryRun) {
					await addPiece(db, name, schema)
				}
				log.info(`Added piece ${name} from schema at ${schemaPath}`)
			} else {
				const pieceDate = piece.date_updated || piece.date_added

				if (fileStat.last_modified > new Date(pieceDate)) {
					if (!dryRun) {
						await updatePiece(db, name, schema)
					}
					log.info(`Updated piece ${name} from schema at ${schemaPath}`)
				}
			}
		}
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

	parseFilename(file: string) {
		return {
			file,
			type: file.match(/\.([^.]+)\.[^.]+$/)?.[1] ?? null,
			format: path.extname(file),
			slug: file.replace(/\.[^.]+\.[^.]+$/, ''),
		}
	}

	async getSchemas() {
		const schemaDir = path.join(LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY)
		const readDir = await this._storage.getFilesIn(schemaDir)

		return readDir.filter((file) => path.extname(file) === `.json`)
	}

	async getTypes() {
		const schemas = await this.getSchemas()

		return schemas.map((schema) => path.basename(schema, '.json'))
	}

	async getFilesIn(dir: string, options?: { deep?: boolean }) {
		const types = await this.getTypes()
		const readdir = await this._storage.getFilesIn(dir, options)
		const result: {
			types: string[]
			pieces: string[]
			assets: string[]
			directories: string[]
		} = {
			pieces: [],
			assets: [],
			directories: [],
			types,
		}

		return readdir.reduce((files, file) => {
			const extension = path.extname(file)
			const isAsset = file.startsWith(ASSETS_DIRECTORY)
			const isHidden = file.startsWith('.')
			const isDirectory = file.endsWith('/')

			if (isAsset && !isDirectory) {
				files.assets.push(file)
			} else if (!isHidden) {
				if (isDirectory) {
					files.directories.push(file)
				} else {
					const type = this.parseFilename(file).type
					const isMarkdown = extension === `.${PieceFileType}`

					if (type && types.includes(type) && isMarkdown) {
						files.pieces.push(file)
					}
				}
			}

			return files
		}, result)
	}
}

export default Pieces
