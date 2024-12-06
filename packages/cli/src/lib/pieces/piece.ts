import { existsSync } from 'fs'
import { copyFile, mkdir, stat, unlink, writeFile } from 'fs/promises'
import log from '../log.js'
import { updateCache, addCache, getCache } from './cache.js'
import { difference } from 'lodash-es'
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
	deleteItemsByIds,
	selectItems,
	selectItem,
	updateItem,
	LuzzleSelectable,
	insertItem,
	getPieceSchemaFromFile,
	getPiece,
	addPiece,
	updatePiece,
	getValidatePieceItemErrors,
} from '@luzzle/core'
import { eachLimit, queue } from 'async'
import { cpus } from 'os'
import path from 'path'
import { calculateHashFromFile, downloadFileOrUrlTo } from './utils.js'
import { ASSETS_DIRECTORY, LUZZLE_DIRECTORY, LUZZLE_SCHEMAS_DIRECTORY } from '../assets.js'
import { fileTypeFromFile } from 'file-type'
import { randomBytes } from 'crypto'
import { JSONSchemaType } from 'ajv/dist/core.js'

export interface InterfacePiece<F extends PieceFrontmatter> {
	new (directory: string, pieceName: string, schemaOverride?: PieceFrontmatterSchema<F>): Piece<F>
}

class Piece<F extends PieceFrontmatter> {
	private _validator?: ReturnType<typeof compile<F>>
	private _schema: PieceFrontmatterSchema<F>
	private _schemaPath: string
	private _directory: string
	private _pieceName: string
	private _fields?: Array<PieceFrontmatterSchemaField>

	constructor(directory: string, pieceName: string, schemaOverride?: PieceFrontmatterSchema<F>) {
		this._directory = directory
		this._schemaPath = path.join(
			this._directory,
			LUZZLE_DIRECTORY,
			LUZZLE_SCHEMAS_DIRECTORY,
			`${pieceName}.json`
		)
		this._schema = schemaOverride || getPieceSchemaFromFile(this._schemaPath)
		this._pieceName = pieceName

		if (this._pieceName !== this._schema.title) {
			throw new Error(`${pieceName} does not match the schema title in ${this._schemaPath}`)
		}
	}

	create(file: string, title: string, empty: boolean = false): PieceMarkdown<F> {
		const frontmatter = initializePieceFrontMatter(this._schema, empty) as F
		return makePieceMarkdown(file, this._pieceName, undefined, { ...frontmatter, title })
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

	getBaseName(file: string): string {
		return path.basename(file).split('.')[0]
	}

	async isOutdated(file: string, db: LuzzleDatabase): Promise<boolean> {
		const fullPath = path.join(this._directory, file)
		const fileStat = await stat(fullPath).catch(() => null)

		if (fileStat) {
			const cache = await getCache(db, file)
			const cachedDate = cache?.date_updated || cache?.date_added

			return !cachedDate || fileStat.mtime.getTime() > cachedDate
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
		const fullPath = path.join(this._directory, file)

		if (existsSync(fullPath)) {
			const data = await extractFullMarkdown(fullPath)

			if (!/^\//.test(file)) {
				return makePieceMarkdown(file, this._pieceName, data.markdown, data.frontmatter as F)
			}
		}

		throw new Error(`${file} does not exist`)
	}

	async write(markdown: PieceMarkdown<F>): Promise<void> {
		const validated = this.validate(markdown)
		const filePath = path.join(this._directory, markdown.filePath)

		if (validated.isValid) {
			const markdownString = makePieceMarkdownString(markdown)
			await writeFile(filePath, markdownString)
		} else {
			throw new Error(
				`Could not write ${markdown.filePath} due to\n\n: ${validated.errors.join('\n')}`
			)
		}
	}

	async syncItemsCleanUp(db: LuzzleDatabase, files: string[], dryRun = false) {
		const dbPieces = await selectItems(db, this._pieceName, ['file_path', 'id'])
		const dbPaths = dbPieces.map((piece) => piece.file_path)
		const diskPaths = files
		const pathDiffs = difference(dbPaths, diskPaths)
		const idsToRemove = dbPieces
			.filter((piece) => pathDiffs.includes(piece.file_path))
			.map((piece) => piece.id)

		try {
			if (idsToRemove.length && dryRun === false) {
				await deleteItemsByIds(db, idsToRemove)
			}

			log.info(`cleaned ${idsToRemove.length} ${this._pieceName}`)
		} catch (err) {
			log.error(`could not clean: ${err}`)
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
				const piecePath = path.join(this._directory, markdown.filePath)
				const hash = await calculateHashFromFile(piecePath)

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
		const dbPiece = await selectItem(db, this._pieceName, markdown.filePath)

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
				const piecePath = path.join(this._directory, markdown.filePath)
				const hash = await calculateHashFromFile(piecePath)

				await updateCache(db, data.file_path, hash)
			}

			log.info(`updated ${markdown.filePath}`)
		} catch (err) {
			log.error(`${markdown.filePath} could not be updated: ${err}`)
		}
	}

	async syncItems(db: LuzzleDatabase, files: string[], dryRun = false) {
		const q = queue<string>(async (file) => {
			const markdown = await this.get(file)
			await this.syncMarkdown(db, markdown, dryRun)
		}, cpus().length)

		q.push(files)

		await q.drain()
	}

	async sync(db: LuzzleDatabase, dryRun: boolean) {
		const fileStat = await stat(this._schemaPath).catch(() => null)

		if (!fileStat) {
			throw new Error(`${this._schemaPath} does not exist`)
		}

		const piece = await getPiece(db, this._pieceName)

		if (!piece) {
			if (!dryRun) {
				await addPiece(db, this._pieceName, this._schema as JSONSchemaType<PieceFrontmatter>)
			}
			log.info(`Added piece ${this._pieceName} from schema at ${this._schemaPath}`)
		} else {
			const pieceDate = piece.date_updated || piece.date_added

			if (fileStat.mtime > new Date(pieceDate)) {
				if (!dryRun) {
					await updatePiece(db, this._pieceName, this._schema as JSONSchemaType<PieceFrontmatter>)
				}
				log.info(`Updated piece ${this._pieceName} from schema at ${this._schemaPath}`)
			}
		}
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

	private async makeAttachmentField(
		file: string,
		field: PieceFrontmatterSchemaField,
		fileOrUrl: string,
		_name?: string
	): Promise<string> {
		const format = field.type === 'array' ? field.items.format : field.format

		/* c8 ignore next 3 */
		if (format !== 'asset') {
			throw new Error(`${field} is not an attachable field for ${this._pieceName} ${file}`)
		}

		const tmpPath = await downloadFileOrUrlTo(fileOrUrl)
		const extension = path.extname(tmpPath) || ''
		const fileType = await fileTypeFromFile(tmpPath)
		const type = fileType?.ext.replace(/^/, '.') || extension
		const fileDir = path.dirname(file)
		const attachDir = path.join(this._directory, ASSETS_DIRECTORY, fileDir, field.name)
		const random = randomBytes(4).toString('hex')
		const baseName = this.getBaseName(file)
		const parts = [baseName, _name, random]
		const filename = `${parts.filter((x) => x).join('-')}${type}`
		const relPath = path.join(ASSETS_DIRECTORY, fileDir, field.name, filename)
		const toPath = path.join(this._directory, relPath)

		await mkdir(attachDir, { recursive: true })
		await copyFile(tmpPath, toPath)
		await unlink(tmpPath)

		return relPath
	}

	async setFields<V>(
		markdown: PieceMarkdown<F>,
		fields: Record<string, unknown>
	): Promise<PieceMarkdown<F>> {
		let updatedMarkdown = markdown

		for (const fieldname in fields) {
			updatedMarkdown = await this.setField<V>(updatedMarkdown, fieldname, fields[fieldname])
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

	async setField<V>(
		markdown: PieceMarkdown<F>,
		field: string,
		value: unknown
	): Promise<PieceMarkdown<F>> {
		const pieceField = this.fields.find((f) => f.name === field)

		if (!pieceField) {
			throw new Error(`${field} is not a field in ${this._pieceName} ${markdown.filePath}`)
		}

		const isArray = pieceField.type === 'array'
		const format = isArray ? pieceField.items.format : pieceField.format
		const type = isArray ? pieceField.items.type : pieceField.type

		let setValue: V = undefined as V

		if (format === 'asset') {
			// for array asset fields, we only allow appending
			// for non-array asset fields, we replace, but do not remove the asset!
			const fieldValue = await this.makeAttachmentField(
				markdown.filePath,
				pieceField,
				value as string
			)
			setValue = fieldValue as V
		} else if (type === 'boolean') {
			setValue = /1|true|yes/.test(value as string) as V
		} else if (type === 'string') {
			setValue = value as V
		} else if (type === 'integer') {
			setValue = parseInt(value as string) as V
		}

		const fieldName = pieceField.name as keyof F
		const oldValue = markdown.frontmatter[fieldName] as V | V[] | undefined
		const newValue = isArray ? ((oldValue || []) as V[]).concat(setValue) : setValue

		return makePieceMarkdown(markdown.filePath, markdown.piece, markdown.note, {
			...markdown.frontmatter,
			[field]: newValue,
		})
	}

	async removeField(markdown: PieceMarkdown<F>, field: string): Promise<PieceMarkdown<F>> {
		const pieceField = this.fields.find((f) => f.name === field)

		if (!pieceField) {
			throw new Error(`${field} is not a field in ${this._pieceName} ${markdown.filePath}`)
		}

		if (pieceField.nullable !== true) {
			throw new Error(`${field} is a required field in ${this._pieceName} ${markdown.filePath}`)
		}

		const fieldname = pieceField.name as keyof PieceMarkdown<F>['frontmatter']
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [fieldname]: _, ...frontmatter } = markdown.frontmatter

		return makePieceMarkdown(
			markdown.filePath,
			markdown.piece,
			markdown.note,
			frontmatter
		) as PieceMarkdown<F>
	}

	async dump(db: LuzzleDatabase, dryRun = false) {
		const pieceData = await selectItems(db, this._pieceName)
		const numCpus = cpus().length

		await eachLimit(pieceData, numCpus, async (data) => {
			try {
				if (dryRun === false) {
					const markdown = this.toMarkdown(data)
					await this.write(markdown)
				}
				log.info(`saving ${this._pieceName} for ${data.file_path} to markdown`)
			} catch (e) {
				log.error(`error saving ${this._pieceName} for ${data.file_path}`)
			}
		})
	}
}

export default Piece
