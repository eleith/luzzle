import Piece from './Piece.js'
import path from 'path'
import type LuzzleStorage from '../storage/abstract.js'
import { jsonToPieceSchema } from './json.schema.js'
import type { LuzzleDatabase } from '../database/tables/index.js'
import { addPiece, deletePiece, getPiece, getPieces, updatePiece } from './manager.js'
import {
	LUZZLE_DIRECTORY,
	LUZZLE_SCHEMAS_DIRECTORY,
	ASSETS_DIRECTORY,
	LUZZLE_PIECE_FILE_EXTENSION,
} from './assets.js'
import { Readable } from 'stream'
import { cpus } from 'os'
import type { JSONSchemaType } from 'ajv'
import type { PieceFrontmatter } from './utils/frontmatter.js'

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

export interface DiffSummary {
	added: string[]
	updated: string[]
	pruned: string[]
}

export type SchemaDiff = DiffSummary

export interface PiecesDiff {
	schemas: DiffSummary
	pieces: DiffSummary
}

type SchemaChange =
	| { action: 'added' | 'updated' | 'skipped'; name: string; schema: JSONSchemaType<PieceFrontmatter> }
	| { name: string; error: true; message: string }

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

	private async getSchemaChange(
		db: LuzzleDatabase,
		name: string,
		options?: { force?: boolean }
	): Promise<SchemaChange> {
		const piece = await getPiece(db, name)
		const schemaPath = this.getSchemaPath(name)
		const fileStat = await this._storage.stat(schemaPath).catch(() => null)

		if (!fileStat) {
			return { name, error: true, message: `schema file ${schemaPath} not found` }
		}

		const schema = await this.getSchema(name)

		if (!piece) {
			return { action: 'added', name, schema }
		}

		const pieceDate = piece.date_updated || piece.date_added
		if (options?.force || fileStat.last_modified > new Date(pieceDate)) {
			return { action: 'updated', name, schema }
		}

		return { action: 'skipped', name, schema }
	}

	async diffSchemas(db: LuzzleDatabase, options?: { force?: boolean }): Promise<SchemaDiff> {
		const names = await this.getTypes()
		const added: string[] = []
		const updated: string[] = []

		for (const name of names) {
			const plan = await this.getSchemaChange(db, name, options)
			if ('error' in plan) {
				continue
			}
			if (plan.action === 'added') {
				added.push(name)
			} else if (plan.action === 'updated') {
				updated.push(name)
			}
		}

		const dbPieces = await getPieces(db)
		const diskPiecesSet = new Set<string>(names)
		const pruned = dbPieces.filter((piece) => !diskPiecesSet.has(piece.name)).map((piece) => piece.name)

		return { added, updated, pruned }
	}

	async diff(db: LuzzleDatabase, options?: { force?: boolean }): Promise<PiecesDiff> {
		const schemas = await this.diffSchemas(db, options)
		const files = await this.getFilesIn('.', { deep: true })
		const pieces: DiffSummary = { added: [], updated: [], pruned: [] }

		for (const type of files.types) {
			const piece = await this.getPiece(type)
			const onDisk = files.pieces.filter((file) => this.parseFilename(file).type === type)

			const stream = await piece.diff(db, onDisk, options)
			for await (const result of stream) {
				if (result.action === 'added') {
					pieces.added.push(result.file)
				} else if (result.action === 'updated') {
					pieces.updated.push(result.file)
				}
			}

			pieces.pruned.push(...(await piece.diffPrune(db, onDisk)))
		}

		return { schemas, pieces }
	}

	async sync(db: LuzzleDatabase, options?: { force?: boolean }) {
		const names = await this.getTypes()
		const stream = Readable.from(names)

		return stream.map(
			async (name: string): Promise<PiecesSyncResult> => {
				const plan = await this.getSchemaChange(db, name, options)

				if ('error' in plan) {
					return plan
				}

				try {
					if (plan.action === 'added') {
						await addPiece(db, name, plan.schema)
					} else if (plan.action === 'updated') {
						await updatePiece(db, name, plan.schema)
					}
					return { action: plan.action, name }
				} catch (error) {
					return { name, error: true, message: `error syncing piece: ${error}` }
				}
			},
			{ concurrency: cpus().length }
		) as Readable & AsyncIterable<PiecesSyncResult>
	}

	async prune(db: LuzzleDatabase) {
		const names = await this.getTypes()
		const dbPieces = await getPieces(db)
		const diskPiecesSet = new Set<string>(names)
		const missingPieces = dbPieces
			.filter((piece) => !diskPiecesSet.has(piece.name))
			.map((piece) => piece.name)
		const stream = Readable.from(missingPieces)

		return stream.map(
			async (name: string): Promise<PiecesPruneResult> => {
				try {
					await deletePiece(db, name)
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

	isAsset(filePath: string): boolean {
		const normalized = path.normalize(filePath)
		return normalized.startsWith(ASSETS_DIRECTORY + '/') || normalized === ASSETS_DIRECTORY
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
			const fullPath = path.join(dir, file)
			const extension = path.extname(file)
			const isDirectory = file.endsWith('/')

			const isHidden = file
				.split(/[\\/]/)
				.some((part) => part.startsWith('.') && part !== ASSETS_DIRECTORY && part !== '')

			if (isHidden) {
				return files
			}

			const isAsset = this.isAsset(fullPath)

			if (isAsset && !isDirectory) {
				files.assets.push(file)
			} else {
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
