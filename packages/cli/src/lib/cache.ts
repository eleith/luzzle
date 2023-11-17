import { JTDSchemaType, SomeJTDSchemaType } from 'ajv/dist/jtd.js'
import { ajv } from '@luzzle/kysely'
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'
import log from './log.js'
import deepmerge from 'deepmerge'
import { existsSync } from 'fs'

export type Cache<T> = {
	lastProcessed?: string
	lastSynced?: string
	database?: T
}

export const CACHE_DIRECTORY = '.cache'

class CacheForType<T> {
	private _validator?: ReturnType<typeof ajv<Cache<T>>>
	private _rootDir: string
	private _schema: JTDSchemaType<Cache<T>>

	private getFilePath(slug: string): string {
		return path.join(this._rootDir, `${slug}.json`)
	}

	constructor(database: JTDSchemaType<T>, dir: string) {
		const schema = {
			properties: {},
			optionalProperties: {
				lastProcessed: {
					type: 'timestamp',
				},
				lastSynced: {
					type: 'timestamp',
				},
				database,
			},
		} as SomeJTDSchemaType as JTDSchemaType<Cache<T>>

		this._schema = schema
		this._rootDir = path.join(dir, CACHE_DIRECTORY)
	}

	private get validator(): ReturnType<typeof ajv<Cache<T>>> {
		this._validator = this._validator || ajv<Cache<T>>(this._schema)
		return this._validator
	}

	async get(slug: string): Promise<Cache<T>> {
		const cachePath = this.getFilePath(slug)

		try {
			const cacheString = await readFile(cachePath, 'utf-8')
			const cache = JSON.parse(cacheString)

			if (cache) {
				if (this.validator(cache)) {
					return cache
				}
				log.warn(`${cachePath} is corrupted and will be rebuilt`)
			}
		} catch (e) {
			log.info(`${cachePath} was not found and will be added`)
		}

		return {}
	}

	async set(slug: string, cache: Cache<T>): Promise<void> {
		const cacheFilePath = this.getFilePath(slug)
		const cacheString = JSON.stringify(cache, null, 2)

		await mkdir(path.dirname(cacheFilePath), { recursive: true })
		await writeFile(cacheFilePath, cacheString)
	}

	async update(slug: string, cacheUpdate: Cache<Partial<T>>): Promise<void> {
		const cacheNow = await this.get(slug)
		const cacheFilePath = this.getFilePath(slug)
		const cache = deepmerge(cacheNow, cacheUpdate)
		const cacheString = JSON.stringify(cache, null, 2)

		await mkdir(path.dirname(cacheFilePath), { recursive: true })
		await writeFile(cacheFilePath, cacheString)
	}

	async getAllFiles(): Promise<string[]> {
		return await readdir(this._rootDir).catch(() => [])
	}

	async remove(slug: string): Promise<void> {
		const cachePath = this.getFilePath(slug)
		if (existsSync(cachePath)) {
			await unlink(cachePath)
			log.info(`deleted stale cache for ${slug}`)
		}
	}
}

export default CacheForType
