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
	getPieceSchemaKeys,
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

	abstract process(config: Config, slugs: string[], dryRun: boolean): Promise<void>
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

	getSchemaKeys() {
		return getPieceSchemaKeys(this._schema)
	}

	toCreateInput(markdown: PieceMarkdown<F>): PieceInsertable<P> {
		const input = {
			id: createId(),
			slug: markdown.slug,
			note: markdown.note,
		} as Record<string, unknown>

		const frontmatterSchema = getPieceSchemaKeys(this._schema)
		const frontmatterKeys = Object.keys(markdown.frontmatter) as (keyof F)[]
		const databaseKeys = getPieceSchemaKeys(this._dbSchema).map((f) => f.name)
		const inputKeys = frontmatterKeys.filter((key) => databaseKeys.includes(key as string))

		inputKeys.forEach((key) => {
			const value = markdown.frontmatter[key]
			const format = frontmatterSchema.find((f) => f.name === key)?.metadata?.format

			input[key as string] = Array.isArray(value)
				? JSON.stringify(value.map((v) => frontmatterToDatabaseValue(v, format)))
				: frontmatterToDatabaseValue(value, format)
		})

		return input as PieceInsertable<P>
	}

	toUpdateInput(markdown: PieceMarkdown<F>, data: D, force = false): PieceUpdatable<P> {
		const update = {
			date_updated: new Date().getTime(),
		} as Record<string, unknown>

		const frontmatterSchema = getPieceSchemaKeys(this._schema)
		const frontmatterKeys = Object.keys(markdown.frontmatter) as (keyof F)[]
		const databaseKeys = getPieceSchemaKeys(this._dbSchema).map((f) => f.name)
		const updateKeys = frontmatterKeys.filter((key) => databaseKeys.includes(key as string))

		updateKeys.forEach((key) => {
			const value = markdown.frontmatter[key]
			const format = frontmatterSchema.find((f) => f.name === key)?.metadata?.format
			const dataValue = data[key as keyof D] as unknown
			const updateValue = Array.isArray(value)
				? JSON.stringify(value.map((v) => frontmatterToDatabaseValue(v, format)))
				: frontmatterToDatabaseValue(value, format)

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
		if (!this.exists(slug)) {
			return null
		}

		const filepath = this.getPath(slug)

		try {
			const data = await extract(filepath)

			if (validate) {
				return toValidatedMarkdown(slug, data.markdown, data.frontmatter, this.validator)
			} else {
				return toMarkdown(slug, data.markdown, data.frontmatter as F)
			}
		} catch (err) {
			log.error(`could not extract ${filepath}: ${err}`)
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
			const schemaKeys = this.getSchemaKeys()
			const removeAll = schemaKeys
				.filter((x) => x.metadata?.format === 'attachment' && x.collection === undefined)
				.map((field) => db['database']?.[field.name as unknown as keyof D])
				.filter((attachment) => attachment)
				.map((attachment) => path.join(this._directories.root, attachment as string))
				.map(unlink)

			const removeAllMulti = schemaKeys
				.filter((x) => x.metadata?.format === 'attachment' && x.collection === 'array')
				.map((field) => db['database']?.[field.name as unknown as keyof D])
				.filter((attachment) => attachment)
				.map((attachment) => JSON.parse(attachment as string))
				.filter((attachment) => Array.isArray(attachment))
				.flatMap((attachment) => attachment)
				.map((attachment) => path.join(this._directories.root, attachment as string))
				.map(unlink)

			await Promise.all(removeAllMulti).catch((err) => {
				log.error(`could not remove all attachments for ${slug}: ${err}`)
			})

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
		const frontmatterSchema = this.getSchemaKeys()
		const dataKeys = Object.keys(data)
		const frontmatterKeys = dataKeys.filter((key) => frontmatterSchema.find((f) => f.name === key))

		frontmatterKeys.forEach((key) => {
			const field = frontmatterSchema.find((f) => f.name === key)
			const format = field?.metadata?.format
			const value =
				field?.collection === 'array'
					? (JSON.parse(data[key as keyof D] as string) as Array<string>)
					: data[key as keyof D]

			frontmatter[key] = Array.isArray(value)
				? value.map((v) => databaseToFrontmatterValue(v, format))
				: databaseToFrontmatterValue(value, format)
		})

		return toValidatedMarkdown(data.slug, data.note, frontmatter as F, this.validator)
	}

	async attach(
		file: string,
		markdown: PieceMarkdown<F>,
		field: string,
		_name?: string
	): Promise<PieceMarkdown<F>> {
		const attachableField = this.getSchemaKeys()
			.filter((f) => f.metadata?.format === 'attachment')
			.find((f) => f.name === field)

		if (!attachableField) {
			throw new Error(
				`${field} is not an attachable field for ${this._pieceTable} ${markdown.slug}`
			)
		}

		const allowedTypes = attachableField.metadata?.enum || []
		const fileType = await fileTypeFromFile(file)
		const type = fileType?.ext

		if (allowedTypes.length && (!type || !allowedTypes.includes(type))) {
			throw new Error(
				`${file} (${type}) is not a valid file, only: ${allowedTypes.join(',')} are allowed`
			)
		}

		const attachDir = path.join(this._directories.assets, field)
		const oldMedia = markdown.frontmatter[field as keyof F] as string | string[] | undefined
		const parts = [markdown.slug, _name, Array.isArray(oldMedia) ? oldMedia.length : 0]
		const filename = `${parts.filter((x) => x).join('-')}.${type}`
		const toPath = path.join(this._directories.assets, field, filename)
		const relPath = path.join(path.basename(this._directories.assets), field, filename)
		const isArray = attachableField.collection === 'array'

		await mkdir(attachDir, { recursive: true })
		await copyFile(file, toPath)

		log.info(`processed and copied ${file} to ${toPath}`)

		return toValidatedMarkdown(
			markdown.slug,
			markdown.note,
			{
				...markdown.frontmatter,
				[field]: isArray ? [relPath].concat(oldMedia || []) : relPath,
			},
			this.validator
		)
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
