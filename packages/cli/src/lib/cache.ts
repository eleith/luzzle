import Ajv, { JTDSchemaType, SomeJTDSchemaType } from 'ajv/dist/jtd.js'
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import path from 'path'
import log from './log.js'
import deepmerge from 'deepmerge'
import { existsSync, mkdirSync } from 'fs'

export type Cache<T> = {
	lastProcessed?: string
	lastSynced?: string
	database?: T
}

export const CACHE_DIRECTORY = '.cache'
const ajv = new Ajv.default()

class CacheForType<T> {
	private validator: ReturnType<typeof ajv.compile<Cache<T>>>
	private rootDir: string

	private getFilePath(slug: string): string {
		return path.join(this.rootDir, `${slug}.json`)
	}

	constructor(database: JTDSchemaType<T>, dir: string) {
		const schema: SomeJTDSchemaType = {
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
		}

		this.validator = ajv.compile<Cache<T>>(schema)
		this.rootDir = path.join(dir, CACHE_DIRECTORY)
		mkdirSync(this.rootDir, { recursive: true })
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
		return await readdir(this.rootDir).catch(() => [])
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
