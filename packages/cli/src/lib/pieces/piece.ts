import Ajv from 'ajv/dist/jtd.js'
import { existsSync, mkdirSync } from 'fs'
import { copyFile, mkdir, readdir, stat, unlink, writeFile } from 'fs/promises'
import log from '../log.js'
import { updateCache, addCache, removeCache, getCache, getCacheAll } from './cache.js'
import { Config } from '../config.js'
import { difference } from 'lodash-es'
import { addTagsTo, keywordsToTags, removeAllTagsFrom, syncTagsFor } from '../tags/index.js'
import {
	LuzzleDatabase,
	PieceInsertable,
	PieceSelectable,
	PieceMarkdown,
	Pieces,
	PieceFrontmatter,
	ajv,
	PieceFrontmatterJtdSchema,
	makePieceInsertable,
	makePieceUpdatable,
	getPieceFrontmatterKeysFromSchema,
	extractFullMarkdown,
	makePieceMarkdown,
	makePieceMarkdownOrThrow,
	makePieceMarkdownString,
	formatPieceFrontmatterValue,
	PieceFrontmatterSchemaField,
} from '@luzzle/kysely'
import { eachLimit } from 'async'
import { cpus } from 'os'
import path from 'path'
import { downloadFileOrUrlTo, PieceDirectories, PieceDirectory, PieceFileType } from './utils.js'
import { ASSETS_DIRECTORY } from '../assets.js'
import { fileTypeFromFile } from 'file-type'
import { randomBytes } from 'crypto'

export interface InterfacePiece<
	P extends Pieces,
	D extends PieceSelectable,
	F extends PieceFrontmatter
> {
	new (pieceRoot: string, db: LuzzleDatabase): Piece<P, D, F>
}

abstract class Piece<P extends Pieces, D extends PieceSelectable, F extends PieceFrontmatter> {
	private _validator?: Ajv.ValidateFunction<F>
	private _schema: PieceFrontmatterJtdSchema<F>
	private _pieceRoot: string
	private _directories: PieceDirectories
	private _pieceTable: P
	private _db: LuzzleDatabase
	private _fields?: PieceFrontmatterSchemaField[]

	constructor(
		pieceRoot: string,
		table: P,
		schema: PieceFrontmatterJtdSchema<F>,
		db: LuzzleDatabase
	) {
		this._pieceRoot = pieceRoot
		this._pieceTable = table
		this._directories = {
			[PieceDirectory.Root]: path.join(this._pieceRoot, this._pieceTable),
			[PieceDirectory.Assets]: path.join(this._pieceRoot, this._pieceTable, ASSETS_DIRECTORY),
		}
		this._db = db
		this._schema = schema
	}

	abstract process(config: Config, slugs: string[], dryRun: boolean): Promise<void>
	abstract fetch(
		config: Config,
		markdown: PieceMarkdown<F>,
		service?: string
	): Promise<PieceMarkdown<F>>
	abstract create(slug: string, title: string): PieceMarkdown<F>

	get type() {
		return this._pieceTable
	}

	protected get validator() {
		this._validator = this._validator || ajv(this._schema)
		return this._validator
	}

	get fields() {
		this._fields = this._fields || getPieceFrontmatterKeysFromSchema(this._schema)
		return this._fields
	}

	initialize(): Piece<P, D, F> {
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

	async getSlugsOutdated(): Promise<string[]> {
		const slugs = await this.getSlugs()
		const outdated: string[] = []

		for (const slug of slugs) {
			const piecePath = this.getPath(slug)
			const fileStat = await stat(piecePath).catch(() => null)

			if (fileStat) {
				const cache = await getCache(this._db, slug, this._pieceTable)
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
		} catch (err) {
			log.error(`could not extract ${filepath}: ${err}`)
			return null
		}
	}

	async write(markdown: PieceMarkdown<F>): Promise<void> {
		const markdownString = makePieceMarkdownString(markdown)
		const markdownPath = this.getPath(markdown.slug)

		await writeFile(markdownPath, markdownString)
	}

	async cleanUpCache(slugs: string[]): Promise<string[]> {
		const caches = await getCacheAll(this._db, this._pieceTable)
		const schemaKeys = this.fields
		const staleSlugs = difference(
			caches.map((cache) => cache.slug),
			slugs
		)

		await eachLimit(staleSlugs, cpus().length, async (slug) => {
			const toRemove: string[] = []
			const attachmentFolders = schemaKeys
				.filter((x) => x.metadata?.format === 'attachment')
				.map((field) => path.join(this._directories.root, field.name as string))

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

			await removeCache(this._db, slug, this._pieceTable)
		})

		return staleSlugs
	}

	async cleanUpSlugs(slugs: string[], dryRun = false) {
		const dbPieces = await this._db.selectFrom(this._pieceTable).select(['slug', 'id']).execute()
		const dbSlugs = dbPieces.map(({ slug }) => slug as string)
		const slugDiffs = difference(dbSlugs, slugs)
		const idsToRemove = dbPieces.filter(({ slug }) => slugDiffs.includes(slug)).map(({ id }) => id)

		try {
			if (idsToRemove.length && dryRun === false) {
				await this._db.deleteFrom(this._pieceTable).where('id', 'in', idsToRemove).execute()
				await removeAllTagsFrom(this._db, idsToRemove, this._pieceTable)
			}

			log.info(`cleaned ${idsToRemove.length} ${this._pieceTable}`)
		} catch (err) {
			log.error(`could not clean: ${err}`)
		}
	}

	async syncCleanUp(dryRun = false) {
		const slugs = await this.getSlugs()

		await this.cleanUpSlugs(slugs, dryRun)
		await this.cleanUpCache(slugs)
	}

	async syncAdd(markdown: PieceMarkdown<F>, dryRun = false): Promise<void> {
		try {
			if (dryRun === false) {
				const createInput = makePieceInsertable(markdown, this._schema)
				const piecePath = this.getPath(markdown.slug)
				const added = await this._db
					.insertInto(this._pieceTable as Pieces)
					.values(createInput as PieceInsertable<Pieces>)
					.returningAll()
					.executeTakeFirstOrThrow()

				if (added.keywords) {
					await addTagsTo(this._db, keywordsToTags(added.keywords), added.id, this._pieceTable)
				}

				await addCache(this._db, markdown.slug, this._pieceTable, piecePath)
			}
			log.info(`added ${markdown.slug}`)
		} catch (err) {
			log.error(err as string)
		}
	}

	async syncMarkdown(markdown: PieceMarkdown<F>, dryRun = false): Promise<void> {
		const dbPiece = await this._db
			.selectFrom(this._pieceTable as Pieces)
			.selectAll()
			.where('slug', '=', markdown.slug)
			.executeTakeFirst()

		if (dbPiece) {
			await this.syncUpdate(markdown, dbPiece as D, dryRun)
		} else {
			await this.syncAdd(markdown, dryRun)
		}
	}

	async syncUpdate(markdown: PieceMarkdown<F>, data: D, dryRun = false): Promise<void> {
		const updateInput = makePieceUpdatable(markdown, this._schema, data, false)
		try {
			if (dryRun === false) {
				const update = await this._db
					.updateTable(this._pieceTable as Pieces)
					.set(updateInput)
					.where('id', '=', data.id)
					.returningAll()
					.executeTakeFirstOrThrow()
				const piecePath = this.getPath(update.slug)

				await syncTagsFor(
					this._db,
					keywordsToTags(update?.keywords || ''),
					update.id,
					this._pieceTable
				)
				await updateCache(this._db, update.slug, this._pieceTable, piecePath)
			}

			log.info(`updated ${markdown.slug}`)
		} catch (err) {
			log.error(`${markdown.slug} could not be updated: ${err}`)
		}
	}

	async sync(slugs: string[], dryRun = false) {
		await eachLimit(slugs, 1, async (slug) => {
			const markdown = await this.get(slug)
			if (markdown) {
				await this.syncMarkdown(markdown, dryRun)
			} else {
				log.error(`could not find ${slug}`)
			}
		})
	}

	toMarkdown(data: D): PieceMarkdown<F> {
		const frontmatter: Record<string, unknown> = {}
		const frontmatterSchema = getPieceFrontmatterKeysFromSchema(this._schema)
		const dataKeys = Object.keys(data)
		const fields = frontmatterSchema.filter((f) => dataKeys.includes(f.name))

		fields.forEach((field) => {
			const format = field.metadata?.format
			const key = field.name
			const value =
				field?.collection === 'array'
					? (JSON.parse(data[key as keyof D] as string) as Array<string>)
					: data[key as keyof D]

			frontmatter[key] = Array.isArray(value)
				? value.map((v) => formatPieceFrontmatterValue(v, format))
				: formatPieceFrontmatterValue(value, format)
		})

		return makePieceMarkdownOrThrow(data.slug, data.note, frontmatter as F, this.validator)
	}

	private async makeAttachmentField(
		slug: string,
		field: PieceFrontmatterSchemaField,
		fileOrUrl: string,
		_name?: string
	): Promise<string> {
		/* c8 ignore next 3 */
		if (field.metadata?.format !== 'attachment') {
			throw new Error(`${field} is not an attachable field for ${this._pieceTable} ${slug}`)
		}

		const tmpPath = await downloadFileOrUrlTo(fileOrUrl)
		const allowedTypes = field.metadata?.enum || []
		const fileType = await fileTypeFromFile(tmpPath)
		const type = fileType?.ext

		if (allowedTypes.length && (!type || !allowedTypes.includes(type))) {
			await unlink(tmpPath)
			throw new Error(
				`${fileOrUrl} (${type}) is not a valid file, only: ${allowedTypes.join(',')} are allowed`
			)
		}

		const attachDir = path.join(this._directories.assets, field.name)
		const random = randomBytes(4).toString('hex')
		const parts = [slug, _name, random]
		const filename = `${parts.filter((x) => x).join('-')}.${type}`
		const toPath = path.join(this._directories.assets, field.name, filename)
		const relPath = path.join(path.basename(this._directories.assets), field.name, filename)

		await mkdir(attachDir, { recursive: true })
		await copyFile(tmpPath, toPath)
		await unlink(tmpPath)

		return relPath
	}

	async editField<V>(
		markdown: PieceMarkdown<F>,
		field: string,
		_value: V
	): Promise<PieceMarkdown<F>> {
		const pieceField = this.fields.find((f) => f.name === field)
		let value = _value

		if (!pieceField) {
			throw new Error(`${field} is not a field in ${this._pieceTable} ${markdown.slug}`)
		}

		if (pieceField.metadata?.format === 'attachment') {
			value = (await this.makeAttachmentField(markdown.slug, pieceField, _value as string)) as V
		}

		const fieldName = pieceField.name as keyof F
		const oldValue = markdown.frontmatter[fieldName] as V | V[] | undefined
		const isArray = pieceField.collection === 'array'
		const newValue = isArray ? ((oldValue || []) as V[]).concat(value) : value

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
			throw new Error(`${field} is not a field in ${this._pieceTable} ${markdown.slug}`)
		}

		if (pieceField.required) {
			throw new Error(`${field} is a required field in ${this._pieceTable} ${markdown.slug}`)
		}

		const fieldname = pieceField.name as keyof PieceMarkdown<F>['frontmatter']

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [fieldname]: _, ...frontmatter } = markdown.frontmatter

		return makePieceMarkdownOrThrow(markdown.slug, markdown.note, frontmatter, this.validator)
	}

	async dump(db: LuzzleDatabase, dryRun = false) {
		const pieceData: D[] = (await db.selectFrom(this._pieceTable).selectAll().execute()) as D[]
		const numCpus = cpus().length

		await eachLimit(pieceData, numCpus, async (data) => {
			try {
				if (dryRun === false) {
					const markdown = this.toMarkdown(data)
					await this.write(markdown)
				}
				log.info(`saving ${this._pieceTable} for ${data.slug} to markdown`)
			} catch (e) {
				log.error(`error saving ${this._pieceTable} for ${data.slug}`)
			}
		})
	}
}

export default Piece
