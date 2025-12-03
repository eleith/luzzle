import Piece from './Piece.js'
import path from 'path'
import LuzzleStorage from '../storage/abstract.js'
import { jsonToPieceSchema } from './json.schema.js'
import { LuzzleDatabase } from '../database/tables/index.js'
import { addPiece, deletePiece, getPiece, getPieces, updatePiece } from './manager.js'
import {
	LUZZLE_DIRECTORY,
	LUZZLE_SCHEMAS_DIRECTORY,
	ASSETS_DIRECTORY,
	LUZZLE_PIECE_FILE_EXTENSION,
} from './assets.js'
import { Readable } from 'stream'
import { cpus } from 'os'

export type PiecesPruneResult =
	| {
		action: 'pruned'
		name: string
		error?: false
	}
	| {
		name: string
		error: true
		message: string
	}

export type PiecesSyncResult =
	| {
		action: 'added' | 'updated' | 'skipped'
		name: string
		error?: false
	}
	| {
		name: string
		error: true
		message: string
	}

class Pieces {
	private _storage: LuzzleStorage

	constructor(storage: LuzzleStorage) {
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
		return (await this._storage.readFile(file)) as Buffer
	}

	getSchemaPath(name: string) {
		return path.join(LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY, `${name}.json`)
	}

	async getSchema(name: string) {
		const schemaPath = this.getSchemaPath(name)
		const schemaJson = await this._storage.readFile(schemaPath, 'text')
		return jsonToPieceSchema(schemaJson as string)
	}

	async sync(db: LuzzleDatabase, options?: { dryRun?: boolean; force?: boolean }) {
		const names = await this.getTypes()
		const stream = Readable.from(names)

		return stream.map(async (name): Promise<PiecesSyncResult> => {
			const piece = await getPiece(db, name)
			const schemaPath = this.getSchemaPath(name)
			const fileStat = await this._storage.stat(schemaPath).catch(() => null)

			if (fileStat) {
				const schema = await this.getSchema(name)

				try {
					if (!piece) {
						if (!options?.dryRun) {
							await addPiece(db, name, schema)
						}
						return { action: 'added', name }
					} else {
						const pieceDate = piece.date_updated || piece.date_added
						if (options?.force || fileStat.last_modified > new Date(pieceDate)) {
							if (!options?.dryRun) {
								await updatePiece(db, name, schema)
							}
							return { action: 'updated', name }
						}
						return { action: 'skipped', name }
					}
				} catch (error) {
					return { name, error: true, message: `error syncing piece: ${error}` }
				}
			} else {
				return { name, error: true, message: `schema file ${schemaPath} not found` }
			}
		}) as Readable & AsyncIterable<PiecesSyncResult>
	}

	async prune(db: LuzzleDatabase, options?: { dryRun: boolean }) {
		const names = await this.getTypes()
		const dbPieces = await getPieces(db)
		const diskPiecesSet = new Set<string>(names)
		const missingPieces = dbPieces
			.filter((piece) => !diskPiecesSet.has(piece.name))
			.map((piece) => piece.name)
		const stream = Readable.from(missingPieces)

		return stream.map(
			async (name): Promise<PiecesPruneResult> => {
				try {
					if (!options?.dryRun) {
						await deletePiece(db, name)
					}
					return { action: 'pruned', name }
				} catch (error) {
					return { name, error: true, message: `error pruning piece: ${error}` }
				}
			},
			{ concurrency: cpus().length }
		) as Readable & AsyncIterable<PiecesPruneResult>
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
					const isMarkdown = extension === `.${LUZZLE_PIECE_FILE_EXTENSION}`

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
