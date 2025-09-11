import log from '../log.js'
import { updateCache, addCache, getCache } from './cache.js'
import {
	LuzzleDatabase,
	PieceMarkdown,
	PieceFrontmatter,
	extractFullMarkdown,
	makePieceMarkdown,
	validatePieceItem,
	makePieceMarkdownString,
	compile,
	PieceFrontmatterSchema,
	initializePieceFrontMatter,
	getPieceFrontmatterSchemaFields,
	PieceFrontmatterSchemaField,
	makePieceItemInsertable,
	makePieceItemUpdatable,
	databaseValueToPieceFrontmatterValue,
	deleteItems,
	selectItem,
	selectItems,
	updateItem,
	LuzzleSelectable,
	insertItem,
	getValidatePieceItemErrors,
} from '@luzzle/core'
import { queue } from 'async'
import { cpus } from 'os'
import path from 'path'
import {
	PieceFileType,
	calculateHashFromFile,
	makePieceAttachment,
	makePieceValue,
} from './utils.js'
import slugify from '@sindresorhus/slugify'
import { Storage } from '../storage/index.js'
import { Readable } from 'stream'

export interface InterfacePiece<F extends PieceFrontmatter> {
	new(directory: string, pieceName: string, schemaOverride?: PieceFrontmatterSchema<F>): Piece<F>
}

class Piece<F extends PieceFrontmatter> {
	private _validator?: ReturnType<typeof compile<F>>
	private _schema: PieceFrontmatterSchema<F>
	private _storage: Storage
	private _pieceName: string
	private _fields?: Array<PieceFrontmatterSchemaField>

	constructor(pieceName: string, storage: Storage, schema: PieceFrontmatterSchema<F>) {
		this._storage = storage
		this._schema = schema
		this._pieceName = pieceName

		if (this._pieceName !== this._schema.title) {
			throw new Error(`${pieceName} does not match the schema title: ${this._schema.title}`)
		}
	}

	async create(directory: string, name: string): Promise<PieceMarkdown<F>> {
		const slug = slugify(name)
		const filename = `${slug}.${this.type}.${PieceFileType}`
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

	async prune(db: LuzzleDatabase, files: string[], dryRun = false) {
		const dbPieces = await selectItems(db, { type: this._pieceName })
		const diskPiecesSet = new Set<string>(files)
		const missingPieces = dbPieces.filter((piece) => !diskPiecesSet.has(piece.file_path))
		const missingFiles = missingPieces.map((piece) => piece.file_path)

		if (missingFiles.length > 0) {
			if (!dryRun) {
				await deleteItems(db, missingFiles)

				for (const file of missingFiles) {
					await this._storage.delete(file)
				}
			}
			missingFiles.forEach((file) => log.info(`pruned piece (db): ${file}`))
		}
	}

	async syncMarkdownAdd(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		dryRun = false
	): Promise<void> {
		try {
			if (dryRun === false) {
				const createInput = makePieceItemInsertable(this._pieceName, markdown, this._schema)
				const readStream = this._storage.createReadStream(markdown.filePath)
				const hash = await calculateHashFromFile(readStream)

				await insertItem(db, createInput)
				await addCache(db, markdown.filePath, hash)
			}
			log.info(`added ${markdown.filePath}`)
		} catch (err) {
			log.error(err as string)
		}
	}

	async syncMarkdown(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		dryRun = false
	): Promise<void> {
		const dbPiece = await selectItem(db, markdown.filePath)

		if (dbPiece) {
			await this.syncMarkdownUpdate(db, markdown, dbPiece, dryRun)
		} else {
			await this.syncMarkdownAdd(db, markdown, dryRun)
		}
	}

	async syncMarkdownUpdate(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		data: LuzzleSelectable<'pieces_items'>,
		dryRun = false
	): Promise<void> {
		const updateInput = makePieceItemUpdatable(markdown, this._schema, data, false)
		try {
			if (dryRun === false) {
				await updateItem(db, markdown.filePath, updateInput)
				const readStream = this._storage.createReadStream(markdown.filePath)
				const hash = await calculateHashFromFile(readStream)

				await updateCache(db, data.file_path, hash)
			}

			log.info(`updated ${markdown.filePath}`)
		} catch (err) {
			log.error(`${markdown.filePath} could not be updated: ${err}`)
		}
	}

	async sync(db: LuzzleDatabase, files: string[], dryRun = false) {
		const q = queue<string>(async (file) => {
			const markdown = await this.get(file)
			await this.syncMarkdown(db, markdown, dryRun)
		}, cpus().length)

		q.push(files)

		await q.drain()
	}

	toMarkdown(data: LuzzleSelectable<'pieces_items'>): PieceMarkdown<F> {
		const frontmatter = JSON.parse(data.frontmatter_json)
		const frontmatterJson: Record<string, unknown> = {}
		const dataKeys = Object.keys(frontmatter)
		const fields = getPieceFrontmatterSchemaFields(this._schema).filter((f) =>
			dataKeys.includes(f.name)
		)

		fields.forEach((field) => {
			const name = field.name
			const value = frontmatter[field.name]

			frontmatterJson[name] = databaseValueToPieceFrontmatterValue(value, field)
		})

		return makePieceMarkdown(data.file_path, data.type, data.note_markdown, frontmatterJson as F)
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
		let updatedMarkdown = markdown as PieceMarkdown<Omit<F, keyof F>>

		for (const field of fields) {
			updatedMarkdown = await this.removeField(markdown, field)
		}

		return updatedMarkdown
	}

	async setField(
		markdown: PieceMarkdown<F>,
		field: string,
		value: unknown
	): Promise<PieceMarkdown<F>> {
		const pieceField = this.fields.find((f) => f.name === field)

		if (!pieceField) {
			throw new Error(`${field} is not a field in ${this._pieceName} ${markdown.filePath}`)
		}

		const isArray = pieceField.type === 'array'
		const values = Array.isArray(value) ? value : [value]
		const set = []

		for (const one of values) {
			try {
				const pieceValue = await makePieceValue(pieceField, one)

				if (pieceValue instanceof Readable) {
					const file = markdown.filePath
					const storage = this._storage
					const asset = await makePieceAttachment(file, pieceField, pieceValue, storage)

					set.push(asset)
				} else {
					set.push(pieceValue)
				}
			} catch (e) {
				const error = e as Error
				log.error(`could not set field ${field} for ${one}: ${error.message}`)
			}
		}

		return makePieceMarkdown(markdown.filePath, markdown.piece, markdown.note, {
			...markdown.frontmatter,
			[field]: isArray ? set : set.pop(),
		})
	}

	async removeField(
		markdown: PieceMarkdown<F>,
		field: string,
		value?: number | string | boolean
	): Promise<PieceMarkdown<F>> {
		const pieceField = this.fields.find((f) => f.name === field)
		const { [field]: fieldValue, ...frontmatter } = markdown.frontmatter

		if (!pieceField) {
			throw new Error(`${field} is not a field in ${this._pieceName} ${markdown.filePath}`)
		}

		if (pieceField.nullable !== true) {
			throw new Error(`${field} is a required field in ${this._pieceName} ${markdown.filePath}`)
		}

		if (value === undefined || fieldValue === undefined) {
			return makePieceMarkdown(markdown.filePath, markdown.piece, markdown.note, frontmatter as F)
		}

		const pieceValue = await makePieceValue(pieceField, value)

		if (Array.isArray(fieldValue)) {
			return makePieceMarkdown<F>(markdown.filePath, markdown.piece, markdown.note, {
				...frontmatter,
				[field]: fieldValue.filter((v) => v !== pieceValue),
			} as F)
		} else if (fieldValue === pieceValue) {
			return makePieceMarkdown(markdown.filePath, markdown.piece, markdown.note, frontmatter as F)
		}

		return markdown
	}
}

export default Piece
