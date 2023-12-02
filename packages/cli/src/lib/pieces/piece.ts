import Ajv from 'ajv/dist/jtd.js'
import { existsSync, mkdirSync } from 'fs'
import { copyFile, mkdir, readdir, stat, unlink, writeFile } from 'fs/promises'
import log from '../log.js'
import { extract } from '../md.js'
import { toValidatedMarkdown, toMarkdownString, PieceMarkdown, toMarkdown } from './markdown.js'
import CacheForType, { Cache } from '../cache.js'
import { Config } from '../config.js'
import { difference } from 'lodash-es'
import { addTagsTo, keywordsToTags, removeAllTagsFrom, syncTagsFor } from '../tags/index.js'
import {
	LuzzleDatabase,
	PieceInsertable,
	PieceSelectable,
	PieceUpdatable,
	Pieces,
	PieceFrontmatter,
	PieceFrontmatterFields,
	ajv,
	PieceFrontmatterJtdSchema,
	PieceDatabaseJtdSchema,
	getDatabaseFieldSchemas,
	getFrontmatterFieldSchemas,
	databaseToFrontmatterValue,
	frontmatterToDatabaseValue,
} from '@luzzle/kysely'
import { eachLimit, filterLimit } from 'async'
import { cpus } from 'os'
import path from 'path'
import { PieceDirectories, PieceDirectory, PieceFileType } from './utils.js'
import { ASSETS_CACHE_DIRECTORY, ASSETS_DIRECTORY } from '../assets.js'
import { fileTypeFromFile } from 'file-type'
import { createId } from '@paralleldrive/cuid2'

export interface InterfacePiece<
	P extends Pieces,
	D extends PieceSelectable,
	F extends PieceFrontmatter<Omit<D, keyof D>, void | PieceFrontmatterFields>
> {
	new (pieceRoot: string): Piece<P, D, F>
}

abstract class Piece<
	P extends Pieces,
	D extends PieceSelectable,
	F extends PieceFrontmatter<Omit<D, keyof D>, void | PieceFrontmatterFields>
> {
	private _validator?: Ajv.ValidateFunction<F>
	private _cache?: CacheForType<D>
	private _schema: PieceFrontmatterJtdSchema<F>
	private _dbSchema: PieceDatabaseJtdSchema<D>
	private _pieceRoot: string
	private _directories: PieceDirectories
	private _pieceTable: P

	constructor(
		pieceRoot: string,
		table: P,
		schema: PieceFrontmatterJtdSchema<F>,
		dbSchema: PieceDatabaseJtdSchema<D>
	) {
		this._pieceRoot = pieceRoot
		this._pieceTable = table
		this._directories = {
			[PieceDirectory.Root]: path.join(this._pieceRoot, this._pieceTable),
			[PieceDirectory.Assets]: path.join(this._pieceRoot, this._pieceTable, ASSETS_DIRECTORY),
			[PieceDirectory.AssetsCache]: path.join(
				this._pieceRoot,
				this._pieceTable,
				ASSETS_CACHE_DIRECTORY
			),
		}
		this._dbSchema = dbSchema
		this._schema = schema
	}

	abstract process(slugs: string[], dryRun: boolean): Promise<void>
	abstract fetch(
		config: Config,
		markdown: PieceMarkdown<F>,
		service?: string
	): Promise<PieceMarkdown<F>>
	abstract create(slug: string, title: string): PieceMarkdown<F>

	protected get table() {
		return this._pieceTable
	}

	protected get validator() {
		this._validator = this._validator || ajv(this._schema)
		return this._validator
	}

	protected get cache() {
		this._cache = this._cache || new CacheForType(this._dbSchema, this._directories.root)
		return this._cache
	}

	initialize(): Piece<P, D, F> {
		Object.entries(this._directories).forEach(([key, dir]) => {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true })
				log.info(`created luzzle ${this.table} ${key} directory: ${dir}`)
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

	toCreateInput(markdown: PieceMarkdown<F>): PieceInsertable<P> {
		const input = {
			id: createId(),
			slug: markdown.slug,
			note: markdown.note,
		} as Record<string, unknown>

		const frontmatterSchema = getFrontmatterFieldSchemas(this._schema)
		const frontmatterKeys = Object.keys(markdown.frontmatter) as (keyof F)[]
		const databaseKeys = getDatabaseFieldSchemas(this._dbSchema).map((f) => f.name)
		const inputKeys = frontmatterKeys.filter((key) => databaseKeys.includes(key as string))

		inputKeys.forEach((key) => {
			const value = markdown.frontmatter[key]
			const format = frontmatterSchema.find((f) => f.name === key)?.format

			input[key as string] = frontmatterToDatabaseValue(value, format)
		})

		return input as PieceInsertable<P>
	}

	toUpdateInput(markdown: PieceMarkdown<F>, data: D, force = false): PieceUpdatable<P> {
		const update = {
			date_updated: new Date().getTime(),
		} as Record<string, unknown>

		const frontmatterSchema = getFrontmatterFieldSchemas(this._schema)
		const frontmatterKeys = Object.keys(markdown.frontmatter) as (keyof F)[]
		const databaseKeys = getDatabaseFieldSchemas(this._dbSchema).map((f) => f.name)
		const updateKeys = frontmatterKeys.filter((key) => databaseKeys.includes(key as string))

		updateKeys.forEach((key) => {
			const frontmatterValue = markdown.frontmatter[key]
			const format = frontmatterSchema.find((f) => f.name === key)?.format
			const dataValue = data[key as keyof D] as unknown
			const updateValue = frontmatterToDatabaseValue(frontmatterValue, format)

			if (force || dataValue !== updateValue) {
				update[key as string] = updateValue
			}
		})

		if (force || markdown.note !== data.note) {
			update['note'] = markdown.note
		}

		if (force || markdown.slug !== data.slug) {
			update['slug'] = markdown.slug
		}

		return update as PieceUpdatable<P>
	}

	async getSlugs(): Promise<string[]> {
		const files = await readdir(this._directories.root, { withFileTypes: true })
		return files
			.filter((dirent) => dirent.isFile() && path.extname(dirent.name) === `.${PieceFileType}`)
			.map((dirent) => path.basename(dirent.name, `.${PieceFileType}`))
	}

	async filterSlugsBy(
		slugs: string[],
		type: keyof Pick<Cache<{ [key: string]: unknown }>, 'lastProcessed' | 'lastSynced'>
	): Promise<string[]> {
		return filterLimit(slugs, cpus().length, async (slug) => {
			const cache = await this.cache.get(slug)
			const piecePath = this.getPath(slug)
			const fileStat = await stat(piecePath).catch(() => null)
			const cachedDate = cache[type]

			if (fileStat) {
				return cachedDate ? fileStat.mtime > new Date(cachedDate) : true
			} else {
				log.error(`${piecePath} does not exist`)
			}

			return false
		})
	}

	exists(slug: string): boolean {
		return existsSync(this.getPath(slug))
	}

	async get(slug: string, validate = true): Promise<PieceMarkdown<F> | null> {
		if (this.exists(slug)) {
			const filepath = this.getPath(slug)
			const data = await extract(filepath)

			if (validate) {
				return toValidatedMarkdown(slug, data.markdown, data.frontmatter, this.validator)
			} else {
				return toMarkdown(slug, data.markdown, data.frontmatter as F)
			}
		} else {
			return null
		}
	}

	async write(markdown: PieceMarkdown<F>): Promise<void> {
		const markdownString = toMarkdownString(markdown)
		const markdownPath = this.getPath(markdown.slug)

		await writeFile(markdownPath, markdownString)

		const cache = {
			lastProcessed: new Date().toJSON(),
		}

		await this.cache.update(markdown.slug, cache)
	}

	async cleanUpCache(slugs: string[]): Promise<string[]> {
		const caches = await this.cache.getAllFiles()
		const staleSlugs = difference(
			caches.map((cacheFile: string) => path.basename(cacheFile, '.json')),
			slugs
		)

		await eachLimit(staleSlugs, cpus().length, async (slug) => {
			const db = await this.cache.get(slug)
			const removeAll = getFrontmatterFieldSchemas(this._schema)
				.filter((x) => x.format === 'attachment')
				.map((field) => db['database']?.[field.name as unknown as keyof D])
				.filter((attachment) => attachment)
				.map((attachment) => path.join(this._directories.assets, attachment as string))
				.map(unlink)

			await Promise.all(removeAll).catch((err) => {
				log.error(`could not remove all attachments for ${slug}: ${err}`)
			})

			await this.cache.remove(slug)
		})

		return staleSlugs
	}

	async cleanUpSlugs(db: LuzzleDatabase, slugs: string[], dryRun = false) {
		const dbPieces = await db.selectFrom(this._pieceTable).select(['slug', 'id']).execute()
		const dbSlugs = dbPieces.map(({ slug }) => slug as string)
		const slugDiffs = difference(dbSlugs, slugs)
		const idsToRemove = dbPieces.filter(({ slug }) => slugDiffs.includes(slug)).map(({ id }) => id)

		try {
			if (idsToRemove.length && dryRun === false) {
				await db.deleteFrom(this._pieceTable).where('id', 'in', idsToRemove).execute()
				await removeAllTagsFrom(db, idsToRemove, this._pieceTable)
			}

			log.info(`cleaned ${idsToRemove.length} ${this._pieceTable}`)
		} catch (err) {
			log.error(`could not clean: ${err}`)
		}
	}

	async syncCleanUp(db: LuzzleDatabase, dryRun = false) {
		const slugs = await this.getSlugs()

		await this.cleanUpSlugs(db, slugs, dryRun)
		await this.cleanUpCache(slugs)
	}

	async syncAdd(db: LuzzleDatabase, markdown: PieceMarkdown<F>, dryRun = false): Promise<void> {
		try {
			if (dryRun === false) {
				const createInput = this.toCreateInput(markdown)
				const added = await db
					.insertInto(this._pieceTable as Pieces)
					.values(createInput as PieceInsertable<Pieces>)
					.returningAll()
					.executeTakeFirstOrThrow()

				if (added.keywords) {
					await addTagsTo(db, keywordsToTags(added.keywords), added.id, this._pieceTable)
				}

				await this.markAsSynced(added as D)
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
		const dbPiece = await db
			.selectFrom(this._pieceTable as Pieces)
			.selectAll()
			.where('slug', '=', markdown.slug)
			.executeTakeFirst()

		if (dbPiece) {
			await this.syncUpdate(db, markdown, dbPiece as D, dryRun)
		} else {
			await this.syncAdd(db, markdown, dryRun)
		}
	}

	async syncUpdate(
		db: LuzzleDatabase,
		markdown: PieceMarkdown<F>,
		data: D,
		dryRun = false
	): Promise<void> {
		const updateInput = this.toUpdateInput(markdown, data as D, false)
		try {
			if (dryRun === false) {
				const update = await db
					.updateTable(this._pieceTable as Pieces)
					.set(updateInput)
					.where('id', '=', data.id)
					.returningAll()
					.executeTakeFirstOrThrow()

				await syncTagsFor(db, keywordsToTags(update?.keywords || ''), update.id, this._pieceTable)
				await this.markAsSynced(update as D)
			}

			log.info(`updated ${markdown.slug}`)
		} catch (err) {
			log.error(`${markdown.slug} could not be updated: ${err}`)
		}
	}

	async markAsSynced(data: D): Promise<void> {
		const dbCache: Partial<D> = {}
		const dbFields = Object.keys(data) as (keyof D)[]

		dbFields.forEach((key) => {
			const attribute = data[key] as D[keyof D] | undefined | null
			if (attribute !== null && attribute !== undefined) {
				dbCache[key as keyof D] = attribute
			}
		})

		await this.cache.update(data.slug, {
			lastSynced: new Date().toJSON(),
			database: dbCache,
		})
	}

	async sync(db: LuzzleDatabase, slugs: string[], dryRun = false) {
		await eachLimit(slugs, 1, async (slug) => {
			const markdown = await this.get(slug)
			if (markdown) {
				await this.syncMarkdown(db, markdown, dryRun)
			} else {
				log.error(`could not find ${slug}`)
			}
		})
	}

	toMarkdown(data: D): PieceMarkdown<F> {
		const frontmatter: Record<string, unknown> = {}
		const frontmatterSchema = getFrontmatterFieldSchemas(this._schema)
		const dataKeys = Object.keys(data)
		const frontmatterKeys = dataKeys.filter((key) => frontmatterSchema.find((f) => f.name === key))

		frontmatterKeys.forEach((key) => {
			const value = data[key as keyof D]
			const format = frontmatterSchema.find((f) => f.name === key)?.format

			frontmatter[key] = databaseToFrontmatterValue(value, format)
		})

		return toValidatedMarkdown(data.slug, data.note, frontmatter as F, this.validator)
	}

	async attach(
		file: string,
		markdown: PieceMarkdown<F>,
		_field?: string,
		_name?: string
	): Promise<PieceMarkdown<F>> {
		const attachables = getFrontmatterFieldSchemas(this._schema).filter(
			(f) => f.format === 'attachment'
		)
		const field = _field ? attachables.find((f) => f.name === _field) : attachables[0]

		if (attachables.length === 0) {
			throw new Error(`this piece does not allow attachments`)
		}

		if (!field) {
			const possibleFields = attachables.map((f) => f.name).join(', ')
			throw new Error(`this piece only allows attachments on: ${possibleFields}`)
		}

		const allowedTypes = field.enum || []
		const fileType = await fileTypeFromFile(file)
		const type = fileType?.ext

		if (allowedTypes.length && (!type || !allowedTypes.includes(type))) {
			throw new Error(
				`${file} is not a valid file type, only: ${allowedTypes.join(',')} are allowed`
			)
		}

		const name = _name || markdown.slug
		const filename = `${name}.${type}`
		const toPath = path.join(this._directories.assets, field.name, filename)
		const attachDir = path.join(this._directories.assets, field.name)
		const relPath = path.join(attachDir, filename)

		await mkdir(attachDir, { recursive: true })
		await copyFile(file, toPath)

		log.info(`processed and copied ${file} to ${toPath}`)

		const writeMarkdown = toValidatedMarkdown(
			markdown.slug,
			markdown.note,
			{ ...markdown.frontmatter, [field.name]: relPath },
			this.validator
		)

		return writeMarkdown
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
