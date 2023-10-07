import { JTDSchemaType } from 'ajv/dist/core.js'
import { eachLimit, filterLimit } from 'async'
import { existsSync, mkdirSync } from 'fs'
import { readdir, stat } from 'fs/promises'
import { difference } from 'lodash-es'
import { cpus } from 'os'
import path from 'path'
import { Argv } from 'yargs'
import { ASSETS_CACHE_DIRECTORY, ASSETS_DIRECTORY } from '../assets.js'
import CacheForType, { Cache } from '../cache.js'
import log from '../log.js'
import { PieceDatabase } from './piece.js'
import { PieceCache } from './cache.js'

export type PieceDirectories = {
	root: string
	assets: string
	'assets.cache': string
}

export type PieceArgv = {
	path: string
	piece?: string
}

export const PieceFileType = 'md'
export const PieceTypes = {
	Books: 'books',
	Posts: 'posts',
} as const

export type PieceType = typeof PieceTypes[keyof typeof PieceTypes]

class Pieces {
	private _directory: string
	private _directories: Record<PieceType | string, PieceDirectories> = {}
	private _caches: Record<PieceType | string, CacheForType<PieceCache<PieceDatabase>>> = {}

	static COMMAND = '<slug|path>'

	static parseArgv(args: PieceArgv): { slug: string; piece: string } {
		const piece = args.piece
		const slug = args.path
		const pathParsed = path.parse(slug)
		const isMarkdown = pathParsed.ext === `.${PieceFileType}`

		if (piece) {
			return { slug, piece }
		} else if (isMarkdown && existsSync(slug)) {
			const dir = /^\.?$/.test(pathParsed.dir) ? path.parse(path.resolve(slug)).dir : pathParsed.dir

			return {
				slug: pathParsed.name,
				piece: path.parse(dir).name,
			}
		}

		if (isMarkdown) {
			throw new Error(`${slug} does not exist`)
		} else if (pathParsed.dir === '') {
			throw new Error(`piece option is required, learn more with --help`)
		} else {
			throw new Error(`${slug} is not a valid piece`)
		}
	}

	static command<T>(yargs: Argv<T>, alias = 'slug'): Argv<T & PieceArgv> {
		return yargs
			.option('piece', {
				type: 'string',
				alias: 'p',
				description: `piece type, required if using <${alias}>`,
				choices: Object.values(PieceTypes),
			})
			.positional('path', {
				type: 'string',
				alias,
				description: `<path|${alias}> of piece`,
				demandOption: `<path|${alias}> is required`,
			})
	}

	constructor(directory: string) {
		if (!existsSync(directory)) {
			mkdirSync(directory, { recursive: true })
			log.info(`created luzzle directory ${directory}`)
		}

		this._directory = directory
	}

	directories(piece: PieceType): PieceDirectories {
		return this._directories[piece]
	}

	/* c8 ignore next 3 */
	caches<T extends PieceCache<PieceDatabase>>(piece: PieceType): CacheForType<T> {
		return this._caches[piece] as CacheForType<T>
	}

	register<T extends PieceDatabase>(
		piece: PieceType,
		schema: JTDSchemaType<PieceCache<T>>
	): Pieces {
		const directories: PieceDirectories = {
			root: path.join(this._directory, piece),
			assets: path.join(this._directory, piece, ASSETS_DIRECTORY),
			'assets.cache': path.join(this._directory, piece, ASSETS_CACHE_DIRECTORY),
		}

		this._directories[piece] = directories
		this._caches[piece] = new CacheForType(
			schema as JTDSchemaType<PieceCache<PieceDatabase>>,
			this._directories[piece].root
		)

		Object.entries(directories).forEach(([key, value]) => {
			if (!existsSync(value)) {
				mkdirSync(value, { recursive: true })
				log.info(`created luzzle ${piece} ${key} directory: ${value}`)
			}
		})

		return this
	}

	getPath(piece: PieceType, slug: string): string {
		const root = this.directories(piece).root
		return path.join(root, this.getFileName(slug))
	}

	getFileName(slug: string): string {
		return `${slug}.${PieceFileType}`
	}

	async getSlugs(piece: PieceType): Promise<string[]> {
		const pieceDirectory = this._directories[piece].root
		const files = await readdir(pieceDirectory, { withFileTypes: true })
		return files
			.filter((dirent) => dirent.isFile() && path.extname(dirent.name) === `.${PieceFileType}`)
			.map((dirent) => path.basename(dirent.name, `.${PieceFileType}`))
	}

	async getSlugsUpdated(
		piece: PieceType,
		type: keyof Pick<Cache<{ [key: string]: unknown }>, 'lastProcessed' | 'lastSynced'>
	): Promise<string[]> {
		const slugs = await this.getSlugs(piece)
		return filterLimit(slugs, cpus().length, async (slug) => {
			const cache = await this.caches(piece).get(slug)
			const piecePath = this.getPath(piece, slug)
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

	async removeStaleCache(piece: PieceType): Promise<string[]> {
		const slugs = await this.getSlugs(piece)
		try {
			const caches = await this.caches(piece).getAllFiles()
			const staleSlugs = difference(
				caches.map((cacheFile: string) => path.basename(cacheFile, '.json')),
				slugs
			)

			await eachLimit(staleSlugs, cpus().length, async (slug) => {
				await this.caches(piece).remove(slug)
			})

			return staleSlugs
		} catch (err) {
			log.error(err)
			return []
		}
	}
}

export default Pieces
