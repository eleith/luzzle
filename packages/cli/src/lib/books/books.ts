import { readdir } from 'fs/promises'
import path from 'path'
import { ASSETS_DIRECTORY, ASSETS_CACHE_DIRECTORY } from '../assets.js'
import { BookDatabaseCache, cacheDatabaseSchema } from './book.schemas.js'
import CacheForType from '../cache.js'
import { mkdirSync } from 'fs'

export const BOOK_DIRECTORY = 'books'
export const BOOK_COVER_DIRECTORY = path.join(ASSETS_DIRECTORY, 'covers')
export const BOOK_COVER_CACHE_DIRECTORY = path.join(ASSETS_CACHE_DIRECTORY, 'covers')

class Books {
	private rootDir: string
	public cache: CacheForType<BookDatabaseCache>

	static getRelativePathForBookCover(slug: string): string {
		return path.join(BOOK_COVER_DIRECTORY, `${slug}.jpg`)
	}

	static getRelativePathForBook(slug: string): string {
		return path.join(BOOK_DIRECTORY, `${slug}.md`)
	}

	constructor(dir: string) {
		this.rootDir = path.join(dir, BOOK_DIRECTORY)
		this.cache = new CacheForType<BookDatabaseCache>(cacheDatabaseSchema, this.rootDir)

		mkdirSync(path.join(this.rootDir, BOOK_COVER_DIRECTORY), { recursive: true })
		mkdirSync(path.join(this.rootDir, BOOK_COVER_CACHE_DIRECTORY), { recursive: true })
	}

	getPathForBookCover(slug: string): string {
		return path.join(this.rootDir, BOOK_COVER_DIRECTORY, `${slug}.jpg`)
	}

	getPathForBookCoverWidthOf(
		slug: string,
		widthSize: 125 | 250 | 500 | 1000,
		type: 'jpg' | 'avif' = 'jpg'
	): string {
		return path.join(this.rootDir, BOOK_COVER_CACHE_DIRECTORY, `${slug}.w${widthSize}.${type}`)
	}

	getPathForBook(slug: string): string {
		return path.join(this.rootDir, `${slug}.md`)
	}

	async getAllSlugs(): Promise<string[]> {
		const files = await readdir(this.rootDir, { withFileTypes: true })
		return files
			.filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.md')
			.map((dirent) => path.basename(dirent.name, '.md'))
	}
}

export default Books
