import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { existsSync, mkdirSync } from 'fs'
import { copyFile, mkdir, readdir, stat, unlink, writeFile } from 'fs/promises'
import log from '../log.js'
import { extract } from '../md.js'
import { toValidatedMarkDown, toMarkDownString } from './markdown.js'
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
	PieceMarkdown,
	PieceType,
	PieceFrontMatterFields,
	ajv,
} from '@luzzle/kysely'
import { eachLimit, filterLimit } from 'async'
import { cpus } from 'os'
import path from 'path'
import { PieceDirectories, PieceDirectory, PieceFileType } from './utils.js'
import { ASSETS_CACHE_DIRECTORY, ASSETS_DIRECTORY } from '../assets.js'
import { fileTypeFromFile } from 'file-type'

export interface InterfacePiece<
	P extends Pieces,
	D extends PieceSelectable,
	M extends PieceMarkdown<D, PieceFrontMatterFields>
> {
	new (pieceRoot: string): Piece<P, D, M>
}

abstract class Piece<
	P extends Pieces,
	D extends PieceSelectable,
	M extends PieceMarkdown<D, PieceFrontMatterFields>
> {
	private _validator?: Ajv.ValidateFunction<M>
	private _cache: CacheForType<PieceType<D>>
	private _schema: JTDSchemaType<M>
	private _pieceRoot: string
	private _directories: PieceDirectories
	private _pieceTable: P
	private _attachable?: {
		[field in keyof M['frontmatter']]?: { type?: string[]; default: boolean }
	}

	constructor(
		pieceRoot: string,
		table: P,
		schema: JTDSchemaType<M>,
		cacheSchema: JTDSchemaType<PieceType<D>>
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
		this._cache = new CacheForType(cacheSchema, this._directories.root)
		this._attachable = undefined
		this._schema = schema

		this._findAttachables()
	}

	abstract toCreateInput(markdown: M): Promise<PieceInsertable<P>>
	abstract toUpdateInput(markdown: M, db: D, force: boolean): Promise<PieceUpdatable<P>>
	abstract process(slugs: string[], dryRun: boolean): Promise<void>
	abstract fetch(config: Config, markdown: M, service?: string): Promise<M>
	abstract create(slug: string, title: string): M

	private _findAttachables() {
		const schema = this._schema as JTDSchemaType<{
			frontmatter: {
				x: unknown
			}
		}>
		const frontmatter = schema.properties.frontmatter
		const fields = { ...frontmatter.properties, ...frontmatter.optionalProperties }

		Object.keys(fields).forEach((_field) => {
			const field = _field as keyof typeof fields
			const x = fields[field]

			if (x.metadata?.luzzleFormat === 'attachment') {
				this._attachable = this._attachable || {}
				this._attachable[field as keyof M['frontmatter']] = {
					type: x.metadata?.luzzleAttachmentType as string[] | undefined,
					default: false,
				}
			}
		})
	}

	protected get table() {
		return this._pieceTable
	}

	protected get directories() {
		return this._directories
	}

	protected get validator() {
		this._validator = this._validator || ajv(this._schema)

		return this._validator
	}

	initialize(): Piece<P, D, M> {
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
			const cache = await this._cache.get(slug)
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

	async get(slug: string): Promise<M | null> {
		if (this.exists(slug)) {
			const filepath = this.getPath(slug)
			const data = (await extract(filepath)) as M
			return toValidatedMarkDown(slug, data.markdown, data.frontmatter, this.validator)
		} else {
			return null
		}
	}

	async write(markdown: M) {
		const markdownString = toMarkDownString(markdown)
		const markdownPath = this.getPath(markdown.slug)

		await writeFile(markdownPath, markdownString)

		const cache = {
			lastProcessed: new Date().toJSON(),
		}

		await this._cache.update(markdown.slug, cache)
	}

	async cleanUpCache(slugs: string[]): Promise<string[]> {
		const attachable = this._attachable
		const caches = await this._cache.getAllFiles()
		const attachFields = Object.keys(attachable || []) as (keyof M['frontmatter'])[]
		const staleSlugs = difference(
			caches.map((cacheFile: string) => path.basename(cacheFile, '.json')),
			slugs
		)

		await eachLimit(staleSlugs, cpus().length, async (slug) => {
			const db = await this._cache.get(slug)
			const removeAll = attachFields
				.map((field) => db['database']?.[field as unknown as keyof PieceType<D>])
				.filter((attachment) => attachment)
				.map((attachment) => path.join(this._directories.assets, attachment as string))
				.map(unlink)

			await Promise.all(removeAll).catch((err) => {
				log.error(`could not remove all attachments for ${slug}: ${err}`)
			})

			await this._cache.remove(slug)
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

	async syncCleanUp(db: LuzzleDatabase, slugs: string[], dryRun = false) {
		await this.cleanUpSlugs(db, slugs, dryRun)
		await this.cleanUpCache(slugs)
	}

	async syncAdd(db: LuzzleDatabase, markdown: M, dryRun = false): Promise<void> {
		try {
			if (dryRun === false) {
				const createInput = await this.toCreateInput(markdown)
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

	async syncMarkDown(db: LuzzleDatabase, markdown: M, dryRun = false): Promise<void> {
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

	async syncUpdate(db: LuzzleDatabase, markdown: M, data: D, dryRun = false): Promise<void> {
		const updateInput = await this.toUpdateInput(markdown, data as D, false)
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
		const dbCache: Partial<PieceType<D>> = {}
		const dbFields = Object.keys(data) as (keyof D)[]

		dbFields.forEach((key) => {
			const attribute = data[key] as PieceType<D>[keyof PieceType<D>] | undefined | null
			if (attribute !== null && attribute !== undefined) {
				dbCache[key as keyof PieceType<D>] = attribute
			}
		})

		await this._cache.update(data.slug, {
			lastSynced: new Date().toJSON(),
			database: dbCache,
		})
	}

	async sync(db: LuzzleDatabase, slugs: string[], dryRun = false) {
		await eachLimit(slugs, 1, async (slug) => {
			const markdown = await this.get(slug)
			if (markdown) {
				await this.syncMarkDown(db, markdown, dryRun)
			} else {
				log.error(`could not find ${slug}`)
			}
		})
	}

	async toMarkDown(data: D): Promise<M> {
		const schema = this._schema as JTDSchemaType<{ frontmatter: { x: unknown } }>
		const schemaFrontmatter = {
			...schema.properties.frontmatter.properties,
			...schema.properties.frontmatter.optionalProperties,
		}
		const frontMatterKeys = Object.keys({ ...schemaFrontmatter }) as (keyof M['frontmatter'])[]
		const frontmatter: Partial<M['frontmatter']> = {}

		frontMatterKeys.forEach((key) => {
			const attribute = data[key as keyof D] as unknown as M['frontmatter'][keyof M['frontmatter']]
			if (attribute !== null && attribute !== undefined) {
				frontmatter[key] = attribute
			}
		})

		// TODO: pieces can implement a data to frontmatter method
		// because this assumes there is a 1:1 translation between them
		// however, that is like rarely true

		return toValidatedMarkDown(
			data.slug,
			data.note?.toString(),
			frontmatter as unknown as M['frontmatter'],
			this.validator
		)
	}

	async attach(file: string, markdown: M, _field?: string, _name?: string): Promise<M> {
		const attachable = this._attachable

		if (!attachable) {
			throw new Error(`this type does not allow attachments`)
		}

		const fields = Object.keys(attachable) as (keyof M['frontmatter'])[]
		const defaultField = fields.find((key) => attachable[key]?.default) || fields[0]
		const field = (_field || defaultField) as keyof M['frontmatter']
		const allowedTypes = attachable[field]?.type

		if (!allowedTypes) {
			throw new Error(`${_field} is not a valid field to attach to`)
		}

		const fileType = await fileTypeFromFile(file)
		const type = fileType?.ext

		if (!type || !allowedTypes.includes(type)) {
			throw new Error(
				`${_field} is not a valid file type, only: ${allowedTypes.join(',')} are allowed`
			)
		}

		const name = _name || markdown.slug
		const filename = `${name}.${fileType.ext}`
		const toPath = path.join(this._directories.assets, field as string, filename)
		const attachDir = path.join(this._directories.assets, field as string)
		const relPath = path.join(attachDir, filename)

		await mkdir(attachDir, { recursive: true })
		await copyFile(file, toPath)

		log.info(`processed and copied ${file} to ${toPath}`)

		const writeMarkdown = toValidatedMarkDown(
			markdown.slug,
			markdown.markdown,
			{ ...markdown.frontmatter, [field]: relPath },
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
					const markdown = await this.toMarkDown(data)
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
