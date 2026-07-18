import { updateCache, addCache, getCache } from './cache.js'
import { cpus } from 'os'
import path from 'path'
import slugify from '@sindresorhus/slugify'
import { Readable } from 'stream'
import type {
	PieceFrontmatter,
	PieceFrontmatterSchema,
	PieceFrontmatterSchemaField,
	PieceFrontMatterValue} from './utils/frontmatter.js';
import {
	databaseValueToPieceFrontmatterValue,
	getPieceFrontmatterSchemaFields,
	initializePieceFrontMatter
} from './utils/frontmatter.js'
import {
	findFrontmatterField,
	setFrontmatterValue,
	unsetFrontmatterValue,
	getFrontmatterValue,
} from './utils/frontmatter.path.js'
import type LuzzleStorage from '../storage/abstract.js'
import type { PieceMarkdown } from './utils/markdown.js';
import { makePieceMarkdown, makePieceMarkdownString } from './utils/markdown.js'
import {
	isAttachableStream,
	calculateHashFromFile,
	savePieceFieldAsset,
	makePieceValue,
} from './utils/piece.js'
import type { LuzzleDatabase, LuzzleSelectable } from '../database/tables/index.js'
import compile from '../lib/ajv.js'
import {
	getValidatePieceItemErrors,
	makePieceItemInsertable,
	makePieceItemUpdatable,
	validatePieceItem,
} from './item.js'
import { extractFullMarkdown } from '../lib/markdown.js'
import { deleteItem, insertItem, selectItem, selectItems, updateItem } from './items.js'
import { LUZZLE_PIECE_FILE_EXTENSION } from './assets.js'

export interface InterfacePiece<F extends PieceFrontmatter> {
	new(directory: string, pieceName: string, schemaOverride?: PieceFrontmatterSchema<F>): Piece<F>
}

export type PiecePruneResult =
	| {
		action: 'pruned'
		file: string
		error?: false
	}
	| {
		file: string
		error: true
		message: string
	}

export type PieceSyncResult =
	| {
		action: 'added' | 'updated' | 'skipped'
		file: string
		error?: false
	}
	| {
		file: string
		error: true
		message: string
	}

export type PieceDiffResult<F extends PieceFrontmatter> =
	| { action: 'added'; file: string; markdown: PieceMarkdown<F> }
	| {
		action: 'updated'
		file: string
		markdown: PieceMarkdown<F>
		dbPiece: LuzzleSelectable<'pieces_items'>
	}
	| { action: 'skipped'; file: string }

class Piece<F extends PieceFrontmatter> {
	private _validator?: ReturnType<typeof compile<F>>
	private _schema: PieceFrontmatterSchema<F>
	private _storage: LuzzleStorage
	private _pieceName: string
	private _fields?: Array<PieceFrontmatterSchemaField>

	constructor(pieceName: string, storage: LuzzleStorage, schema: PieceFrontmatterSchema<F>) {
		this._storage = storage
		this._schema = schema
		this._pieceName = pieceName

		if (this._pieceName !== this._schema.title) {
			throw new Error(`${pieceName} does not match the schema title: ${this._schema.title}`)
		}
	}

	async create(directory: string, name: string): Promise<PieceMarkdown<F>> {
		const slug = slugify(name)
		const filename = `${slug}.${this.type}.${LUZZLE_PIECE_FILE_EXTENSION}`
		const file = path.join(directory, filename)
		const exists = await this._storage.exists(file)

		if (exists) {
			throw new Error(`file already exists: ${file}`)
		}

		const frontmatter = initializePieceFrontMatter(this._schema, true) as F
		return makePieceMarkdown(file, this._pieceName, undefined, frontmatter)
	}

	async delete(file: string) {
		const exists = await this._storage.exists(file)

		if (exists) {
			await this._storage.delete(file)
			return
		}

		throw new Error(`${file} does not exist`)
	}

	get type() {
		return this._pieceName
	}

	get schema() {
		return this._schema
	}

	protected get validator(): ReturnType<typeof compile<F>> {
		this._validator = this._validator || compile<F>(this._schema)
		return this._validator
	}

	get fields() {
		this._fields = this._fields || getPieceFrontmatterSchemaFields(this._schema)
		return this._fields
	}

	async isOutdated(file: string, db: LuzzleDatabase): Promise<boolean> {
		const fileStat = await this._storage.stat(file).catch(() => null)

		if (fileStat) {
			const cache = await getCache(db, file)
			const cachedDate = cache?.date_updated || cache?.date_added

			return !cachedDate || fileStat.last_modified.getTime() > cachedDate
		}

		throw new Error(`${file} does not exist`)
	}

	validate(markdown: PieceMarkdown<F>): { isValid: true } | { isValid: false; errors: string[] } {
		const valid = validatePieceItem(markdown, this.validator)

		if (valid) {
			return { isValid: true }
		} else {
			const errors = getValidatePieceItemErrors(this.validator)
			return { isValid: false, errors }
		}
	}

	async get(file: string): Promise<PieceMarkdown<F>> {
		const exists = await this._storage.exists(file)

		if (exists) {
			const contents = await this._storage.readFile(file, 'text')
			const data = await extractFullMarkdown(contents)

			if (!/^\//.test(file)) {
				return makePieceMarkdown(file, this._pieceName, data.markdown, data.frontmatter as F)
			}
		}

		throw new Error(`${file} does not exist`)
	}

	async write(markdown: PieceMarkdown<F>): Promise<void> {
		const validated = this.validate(markdown)

		if (validated.isValid) {
			const markdownString = makePieceMarkdownString(markdown)
			await this._storage.writeFile(markdown.filePath, markdownString)
		} else {
			throw new Error(
				`Could not write ${markdown.filePath} due to\n\n: ${validated.errors.join('\n')}`
			)
		}
	}

	private async findPrunable(db: LuzzleDatabase, files: string[]): Promise<string[]> {
		const dbPieces = await selectItems(db, { type: this._pieceName })
		const diskPiecesSet = new Set<string>(files)
		return dbPieces
			.filter((piece) => !diskPiecesSet.has(piece.file_path))
			.map((piece) => piece.file_path)
	}

	async diffPrune(db: LuzzleDatabase, files: string[]): Promise<string[]> {
		return this.findPrunable(db, files)
	}

	async prune(db: LuzzleDatabase, files: string[]) {
		const missingFiles = await this.findPrunable(db, files)
		const stream = Readable.from(missingFiles)

		return stream.map(
			async (file: string): Promise<PiecePruneResult> => {
				try {
					await deleteItem(db, file)
					return { action: 'pruned', file }
				} catch (error) {
					return { file, error: true, message: `error pruning piece: ${error}` }
				}
			},
			{ concurrency: cpus().length }
		) as Readable & AsyncIterable<PiecePruneResult>
	}

	private async getChange(
		db: LuzzleDatabase,
		file: string,
		options?: { force?: boolean }
	): Promise<{ result: PieceDiffResult<F>; hash?: string }> {
		const outdated = await this.isOutdated(file, db)

		if (!options?.force && !outdated) {
			return { result: { action: 'skipped', file } }
		}

		const markdown = await this.get(file)
		const dbPiece = await selectItem(db, markdown.filePath)
		const readStream = this._storage.createReadStream(markdown.filePath)
		const hash = await calculateHashFromFile(readStream)

		if (!dbPiece) {
			return { result: { action: 'added', file, markdown }, hash }
		}

		const cache = await getCache(db, markdown.filePath)
		if (options?.force || cache?.content_hash !== hash) {
			return { result: { action: 'updated', file, markdown, dbPiece }, hash }
		}

		return { result: { action: 'skipped', file }, hash }
	}

	async diffFile(
		db: LuzzleDatabase,
		file: string,
		options?: { force?: boolean }
	): Promise<PieceDiffResult<F>> {
		return (await this.getChange(db, file, options)).result
	}

	async diff(db: LuzzleDatabase, files: string[], options?: { force?: boolean }) {
		const stream = Readable.from(files)

		return stream.map((file: string) => this.diffFile(db, file, options), {
			concurrency: cpus().length,
		}) as Readable & AsyncIterable<PieceDiffResult<F>>
	}

	async sync(db: LuzzleDatabase, files: string[], options?: { force?: boolean }) {
		const stream = Readable.from(files)

		return stream.map(
			async (file: string): Promise<PieceSyncResult> => {
				try {
					const { result, hash } = await this.getChange(db, file, options)

					if (result.action === 'added') {
						await this.syncMarkdownAdd(db, result.markdown, hash)
					} else if (result.action === 'updated') {
						await this.syncMarkdownUpdate(db, result.markdown, result.dbPiece, hash)
					} else if (hash) {
						await updateCache(db, file, hash)
					}

					return { action: result.action, file }
				} catch (error) {
					return { file, error: true, message: `error syncing piece: ${error}` }
				}
			},
			{ concurrency: cpus().length }
		) as Readable & AsyncIterable<PieceSyncResult>
	}

	async syncMarkdownAdd(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		hash?: string
	): Promise<void> {
		const createInput = makePieceItemInsertable(this._pieceName, markdown, this._schema)

		let contentHash = hash
		if (contentHash === undefined) {
			const readStream = this._storage.createReadStream(markdown.filePath)
			contentHash = await calculateHashFromFile(readStream)
		}

		await insertItem(db, createInput)
		await addCache(db, markdown.filePath, contentHash)
	}

	async syncMarkdown(db: LuzzleDatabase, markdown: PieceMarkdown<F>): Promise<void> {
		const dbPiece = await selectItem(db, markdown.filePath)

		if (dbPiece) {
			await this.syncMarkdownUpdate(db, markdown, dbPiece)
		} else {
			await this.syncMarkdownAdd(db, markdown)
		}
	}

	async syncMarkdownUpdate(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		data: LuzzleSelectable<'pieces_items'>,
		hash?: string
	): Promise<void> {
		const updateInput = makePieceItemUpdatable(markdown, this._schema, data, false)
		await updateItem(db, markdown.filePath, updateInput)

		let contentHash = hash
		if (contentHash === undefined) {
			const readStream = this._storage.createReadStream(markdown.filePath)
			contentHash = await calculateHashFromFile(readStream)
		}

		await updateCache(db, data.file_path, contentHash)
	}

	toMarkdown(data: LuzzleSelectable<'pieces_items'>): PieceMarkdown<F> {
		const frontmatter = JSON.parse(data.frontmatter_json)
		const frontmatterJson: Record<string, unknown> = {}
		const dataKeys = Object.keys(frontmatter)
		const fields = getPieceFrontmatterSchemaFields(this._schema).filter(
			(f): f is PieceFrontmatterSchemaField & { name: string } =>
				!!f.name && dataKeys.includes(f.name)
		)

		fields.forEach((field) => {
			const name = field.name
			const value = frontmatter[name]

			frontmatterJson[name] = databaseValueToPieceFrontmatterValue(value, field)
		})

		return makePieceMarkdown(data.file_path, data.type, data.note_markdown, frontmatterJson as F)
	}

	getField(markdown: PieceMarkdown<F>, fieldPath: string): PieceFrontMatterValue | undefined {
		return getFrontmatterValue(markdown.frontmatter, fieldPath)
	}

	async setFields(
		markdown: PieceMarkdown<F>,
		fields: Record<string, unknown>
	): Promise<PieceMarkdown<F>> {
		let updatedMarkdown = markdown

		for (const fieldname in fields) {
			updatedMarkdown = await this.setField(updatedMarkdown, fieldname, fields[fieldname])
		}

		return updatedMarkdown
	}

	async removeFields(
		markdown: PieceMarkdown<F>,
		fields: string[]
	): Promise<PieceMarkdown<Omit<F, keyof F>>> {
		let updatedMarkdown = markdown as unknown as PieceMarkdown<Omit<F, keyof F>>

		for (const field of fields) {
			updatedMarkdown = (await this.removeField(
				updatedMarkdown as unknown as PieceMarkdown<F>,
				field
			)) as unknown as PieceMarkdown<Omit<F, keyof F>>
		}

		return updatedMarkdown
	}

	async setField(
		markdown: PieceMarkdown<F>,
		fieldPath: string,
		value: unknown
	): Promise<PieceMarkdown<F>> {
		const pieceField = findFrontmatterField(this.fields, fieldPath)

		if (!pieceField) {
			throw new Error(`${fieldPath} is not a field in ${this._pieceName} ${markdown.filePath}`)
		}

		const isArray = pieceField.type === 'array'
		const itemField = isArray ? { ...pieceField.items, name: pieceField.name } : pieceField
		const values = Array.isArray(value) ? value : [value]

		const updatedFrontmatter = structuredClone(markdown.frontmatter)

		try {
			if (isArray) {
				const current = getFrontmatterValue(updatedFrontmatter, fieldPath)
				if (!Array.isArray(current)) {
					setFrontmatterValue(updatedFrontmatter, fieldPath, [] as unknown as PieceFrontMatterValue)
				}
			}

			for (const one of values) {
				const pieceValue = await makePieceValue(itemField, one)

				const val = isAttachableStream(pieceValue)
					? await savePieceFieldAsset(
						markdown.filePath,
						itemField as PieceFrontmatterSchemaField,
						pieceValue,
						this._storage
					)
					: (pieceValue as PieceFrontMatterValue)

				setFrontmatterValue(updatedFrontmatter, fieldPath, val)
			}
		} catch (e) {
			const error = e as Error
			console.error(`could not set field ${fieldPath}: ${error.message}`)
			return markdown
		}

		return makePieceMarkdown(markdown.filePath, markdown.piece, markdown.note, updatedFrontmatter)
	}

	async removeField(
		markdown: PieceMarkdown<F>,
		fieldPath: string,
		value?: number | string | boolean
	): Promise<PieceMarkdown<F>> {
		const pieceField = findFrontmatterField(this.fields, fieldPath)

		if (!pieceField) {
			throw new Error(`${fieldPath} is not a field in ${this._pieceName} ${markdown.filePath}`)
		}

		if (pieceField.nullable !== true) {
			throw new Error(`${fieldPath} is a required field in ${this._pieceName} ${markdown.filePath}`)
		}

		const updatedFrontmatter = structuredClone(markdown.frontmatter)

		if (value === undefined) {
			unsetFrontmatterValue(updatedFrontmatter, fieldPath)
		} else {
			const pieceValue = await makePieceValue(pieceField, value)
			const current = getFrontmatterValue(updatedFrontmatter, fieldPath)

			if (Array.isArray(current) && !isAttachableStream(pieceValue)) {
				const index = current.indexOf(pieceValue as PieceFrontMatterValue)
				if (index !== -1) {
					unsetFrontmatterValue(updatedFrontmatter, `${fieldPath}.${index}`)
				} else {
					return markdown
				}
			} else if (current === pieceValue) {
				unsetFrontmatterValue(updatedFrontmatter, fieldPath)
			}
		}

		return makePieceMarkdown(markdown.filePath, markdown.piece, markdown.note, updatedFrontmatter)
	}
}

export default Piece
