import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { existsSync } from 'fs'
import { readdir, stat, writeFile } from 'fs/promises'
import log from '../log.js'
import { extract } from '../md.js'
import { PieceMarkDown, toValidatedMarkDown, toMarkDownString } from './markdown.js'
import { PieceCache } from './cache.js'
import CacheForType, { Cache } from '../cache.js'
import { Config } from '../config.js'
import { FetchArgv } from '../commands/fetch.js'
import { difference } from 'lodash-es'
import { addTagsTo, keywordsToTags, removeAllTagsFrom, syncTagsFor } from '../tags/index.js'
import {
	LuzzleDatabase,
	PieceInsertable,
	PieceSelectable,
	PieceTables,
	PieceUpdatable,
} from '@luzzle/kysely'
import { eachLimit, filterLimit } from 'async'
import { cpus } from 'os'
import path from 'path'
import { PieceDirectories, PieceDirectory, PieceFileType, PieceTypes } from './utils.js'
import { ASSETS_CACHE_DIRECTORY, ASSETS_DIRECTORY } from '../assets.js'

export interface InterfacePiece<
	P extends PieceTypes,
	D extends PieceSelectable,
	M extends PieceMarkDown<D, keyof D>
> {
	new (pieceRoot: string): Piece<P, D, M>
}

abstract class Piece<
	P extends PieceTypes,
	D extends PieceSelectable,
	M extends PieceMarkDown<D, keyof D>
> {
	private _validator: Ajv.ValidateFunction<M>
	private _cache: CacheForType<PieceCache<D>>
	private _pieceRoot: string
	private _directories: PieceDirectories
	private _pieceTable: P

	constructor(
		pieceRoot: string,
		table: P,
		validator: Ajv.ValidateFunction<M>,
		cacheSchema: JTDSchemaType<PieceCache<D>>
	) {
		this._validator = validator
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
	}

	abstract toCreateInput(markdown: M): Promise<PieceInsertable>
	abstract toUpdateInput(markdown: M, db: D, force: boolean): Promise<PieceUpdatable>
	abstract attach(slug: string, file: string): Promise<void>
	abstract process(slugs: string[], dryRun: boolean): Promise<void>
	abstract fetch(config: Config, args: FetchArgv, markdown: M): Promise<M>
	abstract create(slug: string, title: string): M

	get cache() {
		return this._cache
	}

	get table() {
		return this._pieceTable
	}

	get directories() {
		return this._directories
	}

	get validator() {
		return this._validator
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
			return toValidatedMarkDown(slug, data.markdown, data.frontmatter, this._validator)
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
		try {
			const caches = await this._cache.getAllFiles()
			const staleSlugs = difference(
				caches.map((cacheFile: string) => path.basename(cacheFile, '.json')),
				slugs
			)

			await eachLimit(staleSlugs, cpus().length, async (slug) => {
				await this._cache.remove(slug)
			})

			return staleSlugs
		} catch (err) {
			log.error(err)
			return []
		}
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
					.insertInto(this._pieceTable as PieceTables)
					.values(createInput)
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
			.selectFrom(this._pieceTable as PieceTables)
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
					.updateTable(this._pieceTable as PieceTables)
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
		const dbCache: Partial<PieceCache<D>> = {}
		const dbFields = Object.keys(data) as (keyof PieceCache<D>)[]

		dbFields.forEach((key) => {
			const attribute = data[key as keyof D]
			if (attribute !== null && attribute !== undefined) {
				dbCache[key] = attribute as PieceCache<D>[keyof PieceCache<D>]
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
		const frontmatter: Partial<D> = {}
		const schema = this._validator.schema as M
		const fields = Object.keys({ ...schema.frontmatter }) as (keyof D)[]

		fields.forEach((key) => {
			const attribute = data[key]
			if (attribute !== null && attribute !== undefined) {
				frontmatter[key] = attribute
			}
		})

		return toValidatedMarkDown(data.slug, data.note?.toString(), frontmatter, this._validator)
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
