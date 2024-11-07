import { existsSync, mkdirSync } from 'fs'
import { copyFile, mkdir, readdir, stat, unlink, writeFile } from 'fs/promises'
import log from '../log.js'
import { updateCache, addCache, removeCache, getCache, getCacheAll, clearCache } from './cache.js'
import { difference } from 'lodash-es'
import {
	LuzzleDatabase,
	PieceMarkdown,
	PieceFrontmatter,
	extractFullMarkdown,
	makePieceMarkdown,
	makePieceMarkdownOrThrow,
	makePieceMarkdownString,
	compile,
	PieceFrontmatterSchema,
	initializePieceFrontMatter,
	getPieceFrontmatterSchemaFields,
	PieceFrontmatterSchemaField,
	makePieceItemInsertable,
	makePieceItemUpdatable,
	databaseValueToPieceFrontmatterValue,
	PieceMarkdownError,
	deleteItems,
	selectItems,
	selectItem,
	updateItem,
	PiecesItemsSelectable,
	insertItem,
	getPieceSchemaFromFile,
	getPiece,
	addPiece,
	updatePiece,
} from '@luzzle/core'
import { eachLimit, queue } from 'async'
import { cpus } from 'os'
import path from 'path'
import { downloadFileOrUrlTo, PieceDirectories, PieceDirectory, PieceFileType } from './utils.js'
import { ASSETS_DIRECTORY, LUZZLE_SCHEMA_FILE_PATH } from '../assets.js'
import { fileTypeFromFile } from 'file-type'
import { randomBytes } from 'crypto'
import { JSONSchemaType } from 'ajv/dist/core.js'

export interface InterfacePiece<D extends PiecesItemsSelectable, F extends PieceFrontmatter> {
	new (pieceRoot: string, pieceName: string): Piece<D, F>
}

class Piece<D extends PiecesItemsSelectable, F extends PieceFrontmatter> {
	private _validator?: ReturnType<typeof compile<F>>
	private _schema: PieceFrontmatterSchema<F>
	private _schemaPath: string
	private _pieceRoot: string
	private _directories: PieceDirectories
	private _pieceName: string
	private _fields?: Array<PieceFrontmatterSchemaField>

	constructor(pieceRoot: string, pieceName: string, schema?: PieceFrontmatterSchema<F>) {
		this._pieceRoot = pieceRoot
		this._directories = {
			[PieceDirectory.Root]: path.join(this._pieceRoot, pieceName),
			[PieceDirectory.Assets]: path.join(this._pieceRoot, pieceName, ASSETS_DIRECTORY),
		}
		this._schemaPath = path.join(this._directories.root, LUZZLE_SCHEMA_FILE_PATH)
		this._schema = schema || getPieceSchemaFromFile(this._schemaPath)
		this._pieceName = pieceName

		if (this._pieceName !== this._schema.title) {
			throw new Error(`${pieceName} does not match the schema title in ${this._schemaPath}`)
		}
	}

	create(slug: string, title: string, empty: boolean = false): PieceMarkdown<F> {
		const frontmatter = initializePieceFrontMatter(this._schema, empty) as F
		return makePieceMarkdownOrThrow(slug, '', { ...frontmatter, title }, this.validator)
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

	initialize(): Piece<D, F> {
		Object.entries(this._directories).forEach(([key, dir]) => {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true })
				log.info(`created luzzle ${this.type} ${key} directory: ${dir}`)
			}
		})

		return this
	}

	getFileName(slug: string): string {
		return `${slug}.${PieceFileType}`
	}

	getPath(slug: string): string {
		return path.join(this._directories.root, this.getFileName(slug))
	}

	async getSlugs(): Promise<string[]> {
		const files = await readdir(this._directories.root, { withFileTypes: true })
		return files
			.filter((dirent) => dirent.isFile() && path.extname(dirent.name) === `.${PieceFileType}`)
			.map((dirent) => path.basename(dirent.name, `.${PieceFileType}`))
	}

	async getSlugsOutdated(db: LuzzleDatabase): Promise<string[]> {
		const slugs = await this.getSlugs()
		const outdated: string[] = []

		for (const slug of slugs) {
			const piecePath = this.getPath(slug)
			const fileStat = await stat(piecePath).catch(() => null)

			if (fileStat) {
				const cache = await getCache(db, slug, this._pieceName)
				const cachedDate = cache?.date_updated || cache?.date_added

				if (!cachedDate || fileStat.mtime > new Date(cachedDate)) {
					outdated.push(slug)
				}
			} else {
				log.error(`${piecePath} does not exist`)
			}
		}

		return outdated
	}

	exists(slug: string): boolean {
		return existsSync(this.getPath(slug))
	}

	async get(slug: string, validate = true): Promise<PieceMarkdown<F> | null> {
		if (!this.exists(slug)) {
			return null
		}

		const filepath = this.getPath(slug)

		try {
			const data = await extractFullMarkdown(filepath)

			if (validate) {
				return makePieceMarkdownOrThrow(slug, data.markdown, data.frontmatter, this.validator)
			} else {
				return makePieceMarkdown(slug, data.markdown, data.frontmatter as F)
			}
		} catch (e) {
			/* c8 ignore next 7 */
			if (e instanceof PieceMarkdownError) {
				const errors = this.getErrors(e)
				log.error(`${slug} has ${e.validationErrors?.length} error(s): ${errors.join('\n')}`)
			} else {
				log.error(`could not extract ${filepath}: ${e}`)
			}
			return null
		}
	}

	async write(markdown: PieceMarkdown<F>): Promise<void> {
		const markdownString = makePieceMarkdownString(markdown)
		const markdownPath = this.getPath(markdown.slug)

		await writeFile(markdownPath, markdownString)
	}

	async cleanUpCache(db: LuzzleDatabase, slugs: string[]): Promise<string[]> {
		const caches = await getCacheAll(db, this._pieceName)
		const schemaKeys = this.fields
		const staleSlugs = difference(
			caches.map((cache) => cache.slug),
			slugs
		)

		await eachLimit(staleSlugs, cpus().length, async (slug) => {
			const toRemove: string[] = []
			const attachmentFolders = schemaKeys
				.filter((field) => field.format === 'asset')
				.map((field) => path.join(this._directories.root, ASSETS_DIRECTORY, field.name))

			for (const folder of attachmentFolders) {
				const files = await readdir(folder)
				const slugRegExp = new RegExp(`^${slug}(-.+)?$`)
				const matches = files
					.filter((file) => {
						return slugRegExp.test(path.parse(file).name)
					})
					.map((file) => path.join(folder, file))

				toRemove.push(...matches)
			}

			await Promise.all(toRemove.map(unlink)).catch((err) => {
				log.error(`could not remove all attachments for ${slug}: ${err}`)
			})

			await removeCache(db, slug, this._pieceName)
		})

		return staleSlugs
	}

	async cleanUpSlugs(db: LuzzleDatabase, slugs: string[], dryRun = false) {
		const dbPieces = await selectItems(db, this._pieceName, ['slug', 'id'])
		const dbSlugs = dbPieces.map(({ slug }) => slug as string)
		const slugDiffs = difference(dbSlugs, slugs)
		const idsToRemove = dbPieces
			.filter(({ slug }) => slugDiffs.includes(slug as string))
			.map(({ id }) => id as string)

		try {
			if (idsToRemove.length && dryRun === false) {
				await deleteItems(db, this._pieceName, idsToRemove)
			}

			log.info(`cleaned ${idsToRemove.length} ${this._pieceName}`)
		} catch (err) {
			log.error(`could not clean: ${err}`)
		}
	}

	async syncItemsCleanUp(db: LuzzleDatabase, dryRun = false) {
		const slugs = await this.getSlugs()

		await this.cleanUpSlugs(db, slugs, dryRun)
		await this.cleanUpCache(db, slugs)
	}

	async syncMarkdownAdd(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		dryRun = false
	): Promise<void> {
		try {
			if (dryRun === false) {
				const createInput = makePieceItemInsertable(markdown, this._schema)
				const piecePath = this.getPath(markdown.slug)

				await insertItem(db, this._pieceName, createInput)
				await addCache(db, markdown.slug, this._pieceName, piecePath)
			}
			log.info(`added ${markdown.slug}`)
		} catch (err) {
			log.error(err as string)
		}
	}

	async syncMarkdown(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		dryRun = false
	): Promise<void> {
		const dbPiece = await selectItem(db, this._pieceName, markdown.slug)

		if (dbPiece) {
			await this.syncMarkdownUpdate(db, markdown, dbPiece as D, dryRun)
		} else {
			await this.syncMarkdownAdd(db, markdown, dryRun)
		}
	}

	async syncMarkdownUpdate(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		data: D,
		dryRun = false
	): Promise<void> {
		const updateInput = makePieceItemUpdatable(markdown, this._schema, data, false)
		try {
			if (dryRun === false) {
				await updateItem(db, this._pieceName, data.id as string, updateInput)
				const piecePath = this.getPath(data.slug as string)

				await updateCache(db, data.slug as string, this._pieceName, piecePath)
			}

			log.info(`updated ${markdown.slug}`)
		} catch (err) {
			log.error(`${markdown.slug} could not be updated: ${err}`)
		}
	}

	async syncItems(db: LuzzleDatabase, slugs: string[], dryRun = false) {
		const q = queue(async (slug) => {
			const markdown = await this.get(slug as string)
			if (markdown) {
				await this.syncMarkdown(db, markdown, dryRun)
			} else {
				log.error(`could not find ${slug}`)
			}
		}, cpus().length)

		q.push(slugs)

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
					await clearCache(db, this._pieceName)
				}
				log.info(`Updated piece ${this._pieceName} from schema at ${this._schemaPath}`)
			}
		}
	}

	toMarkdown(data: D): PieceMarkdown<F> {
		const frontmatter: Record<string, unknown> = {}
		const dataKeys = Object.keys(data)
		const fields = getPieceFrontmatterSchemaFields(this._schema).filter((f) =>
			dataKeys.includes(f.name)
		)

		fields.forEach((field) => {
			const name = field.name
			const value = data[field.name as keyof D]

			frontmatter[name] = databaseValueToPieceFrontmatterValue(value, field)
		})

		return makePieceMarkdownOrThrow(
			data.slug as string,
			data.note as string | null | undefined,
			frontmatter as F,
			this.validator
		)
	}

	private async makeAttachmentField(
		slug: string,
		field: PieceFrontmatterSchemaField,
		fileOrUrl: string,
		_name?: string
	): Promise<string> {
		const format = field.type === 'array' ? field.items.format : field.format

		/* c8 ignore next 3 */
		if (format !== 'asset') {
			throw new Error(`${field} is not an attachable field for ${this._pieceName} ${slug}`)
		}

		const tmpPath = await downloadFileOrUrlTo(fileOrUrl)
		const extension = path.extname(tmpPath) || ''
		const fileType = await fileTypeFromFile(tmpPath)
		const type = fileType?.ext.replace(/^/, '.') || extension
		const attachDir = path.join(this._directories.assets, field.name)
		const random = randomBytes(4).toString('hex')
		const parts = [slug, _name, random]
		const filename = `${parts.filter((x) => x).join('-')}${type}`
		const toPath = path.join(this._directories.assets, field.name, filename)
		const relPath = path.join(path.basename(this._directories.assets), field.name, filename)

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

	async removeFields(markdown: PieceMarkdown<F>, fields: string[]): Promise<PieceMarkdown<F>> {
		let updatedMarkdown = markdown

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
			throw new Error(`${field} is not a field in ${this._pieceName} ${markdown.slug}`)
		}

		const isArray = pieceField.type === 'array'
		const format = isArray ? pieceField.items.format : pieceField.format
		const type = isArray ? pieceField.items.type : pieceField.type

		let setValue: V = undefined as V

		if (format === 'asset') {
			// for array asset fields, we only allow appending
			// for non-array asset fields, we replace, but do not remove the asset!
			const fieldValue = await this.makeAttachmentField(markdown.slug, pieceField, value as string)
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

		return makePieceMarkdownOrThrow(
			markdown.slug,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: newValue,
			},
			this.validator
		)
	}

	async removeField(markdown: PieceMarkdown<F>, field: string): Promise<PieceMarkdown<F>> {
		const pieceField = this.fields.find((f) => f.name === field)

		if (!pieceField) {
			throw new Error(`${field} is not a field in ${this._pieceName} ${markdown.slug}`)
		}

		if (pieceField.nullable !== true) {
			throw new Error(`${field} is a required field in ${this._pieceName} ${markdown.slug}`)
		}

		const fieldname = pieceField.name as keyof PieceMarkdown<F>['frontmatter']
		const isArray = pieceField.type === 'array'
		const format = isArray ? pieceField.items.format : pieceField.format

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [fieldname]: _, ...frontmatter } = markdown.frontmatter

		if (format === 'asset') {
			const value = markdown.frontmatter[fieldname]
			const valueArray = Array.isArray(value) ? value : [value]

			for (const one of valueArray) {
				const attachmentPath = path.join(this._directories.root, one as string)
				if (existsSync(attachmentPath)) {
					await unlink(attachmentPath)
					log.info(`removed attachment at ${attachmentPath}`)
				} else {
					log.info(`no attachment to remove at ${attachmentPath}`)
				}
			}
		}

		return makePieceMarkdownOrThrow(markdown.slug, markdown.note, frontmatter, this.validator)
	}

	async dump(db: LuzzleDatabase, dryRun = false) {
		const pieceData = await selectItems(db, this._pieceName)
		const numCpus = cpus().length

		await eachLimit(pieceData, numCpus, async (data) => {
			try {
				if (dryRun === false) {
					const markdown = this.toMarkdown(data as D)
					await this.write(markdown)
				}
				log.info(`saving ${this._pieceName} for ${data.slug} to markdown`)
			} catch (e) {
				log.error(`error saving ${this._pieceName} for ${data.slug}`)
			}
		})
	}

	getErrors<F>(e: PieceMarkdownError<ReturnType<typeof compile<F>>>) {
		const errorMessage: Array<string> = []

		e.validationErrors?.map((error) => {
			const path = error.instancePath.replace('/frontmatter/', '')
			errorMessage.push(`${path}: ${error.message}`)
		})

		return errorMessage
	}
}

export default Piece
