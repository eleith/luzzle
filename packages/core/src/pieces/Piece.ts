import { updateCache, addCache, getCache } from './cache.js'
import { cpus } from 'os'
import path from 'path'
import slugify from '@sindresorhus/slugify'
import { Readable } from 'stream'
import {
	databaseValueToPieceFrontmatterValue,
	getPieceFrontmatterSchemaFields,
	initializePieceFrontMatter,
	PieceFrontmatter,
	PieceFrontmatterSchema,
	PieceFrontmatterSchemaField,
	PieceFrontMatterValue,
} from './utils/frontmatter.js'
import {
	findFrontmatterField,
	setFrontmatterValue,
	unsetFrontmatterValue,
	getFrontmatterValue,
} from './utils/frontmatter.path.js'
import LuzzleStorage from '../storage/abstract.js'
import { makePieceMarkdown, makePieceMarkdownString, PieceMarkdown } from './utils/markdown.js'
import {
	isAttachableStream,
	calculateHashFromFile,
	makePieceAttachment,
	makePieceValue,
} from './utils/piece.js'
import { LuzzleDatabase, LuzzleSelectable } from '../database/tables/index.js'
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

	async prune(db: LuzzleDatabase, files: string[], options?: { dryRun: boolean }) {
		const dbPieces = await selectItems(db, { type: this._pieceName })
		const diskPiecesSet = new Set<string>(files)
		const missingPieces = dbPieces.filter((piece) => !diskPiecesSet.has(piece.file_path))
		const missingFiles = missingPieces.map((piece) => piece.file_path)
		const stream = Readable.from(missingFiles)

		return stream.map(
			async (file: string): Promise<PiecePruneResult> => {
				try {
					if (!options?.dryRun) {
						await deleteItem(db, file)
					}
					return { action: 'pruned', file }
				} catch (error) {
					return { file, error: true, message: `error pruning piece: ${error}` }
				}
			},
			{ concurrency: cpus().length }
		) as Readable & AsyncIterable<PiecePruneResult>
	}

	async sync(db: LuzzleDatabase, files: string[], options?: { dryRun?: boolean; force?: boolean }) {
		const stream = Readable.from(files)

		return stream.map(
			async (file: string): Promise<PieceSyncResult> => {
				try {
					const markdown = await this.get(file)
					const dbPiece = await selectItem(db, markdown.filePath)

					if (dbPiece) {
						const readStream = this._storage.createReadStream(markdown.filePath)
						const newHash = await calculateHashFromFile(readStream)
						const cache = await getCache(db, markdown.filePath)
						if (options?.force || cache?.content_hash !== newHash) {
							if (!options?.dryRun) {
								await this.syncMarkdownUpdate(db, markdown, dbPiece)
							}
							return { action: 'updated', file }
						}
						return { action: 'skipped', file }
					} else {
						if (!options?.dryRun) {
							await this.syncMarkdownAdd(db, markdown)
						}
						return { action: 'added', file }
					}
				} catch (error) {
					return { file, error: true, message: `error syncing piece: ${error}` }
				}
			},
			{ concurrency: cpus().length }
		) as Readable & AsyncIterable<PieceSyncResult>
	}

	async syncMarkdownAdd(db: LuzzleDatabase, markdown: PieceMarkdown<F>): Promise<void> {
		const createInput = makePieceItemInsertable(this._pieceName, markdown, this._schema)
		const readStream = this._storage.createReadStream(markdown.filePath)
		const hash = await calculateHashFromFile(readStream)

		await insertItem(db, createInput)
		await addCache(db, markdown.filePath, hash)
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
		data: LuzzleSelectable<'pieces_items'>
	): Promise<void> {
		const updateInput = makePieceItemUpdatable(markdown, this._schema, data, false)
		await updateItem(db, markdown.filePath, updateInput)
		const readStream = this._storage.createReadStream(markdown.filePath)
		const hash = await calculateHashFromFile(readStream)

		await updateCache(db, data.file_path, hash)
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
					? await makePieceAttachment(
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
