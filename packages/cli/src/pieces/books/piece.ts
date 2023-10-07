import { eachLimit } from 'async'
import { copyFile, unlink, stat } from 'fs/promises'
import { cpus } from 'os'
import path from 'path'
import log from '../../lib/log.js'
import { downloadTo } from '../../lib/web.js'
import { fileTypeFromFile } from 'file-type'
import { findVolume } from './google-books.js'
import { findWork, getBook as getOpenLibraryBook, getCoverUrl } from './open-library.js'
import sharp from 'sharp'
import crypto from 'crypto'
import { existsSync } from 'fs'
import {
	bookMdSchema,
	cacheDatabaseSchema,
	BookMarkDown,
	BookDatabaseOnlyFields,
	bookMdValidator,
	BookCacheSchema,
} from './book.schemas.js'
import { Piece, PieceTypes, toValidatedMarkDown } from '../../lib/pieces/index.js'
import { createId } from '@paralleldrive/cuid2'
import { Book, BookInsert, BookUpdate } from '@luzzle/kysely'
import { generateDescription, generateTags } from './openai.js'
import { ASSETS_DIRECTORY } from '../../lib/assets.js'

const BOOK_COVER_DIRECTORY = 'covers'

function _getReadOrder(
	year: number = new Date(1970).getFullYear(),
	month: number = new Date(1970, 1).getMonth() + 1
): string {
	const rand = crypto.randomBytes(2).toString('hex')
	const timeStamp = `${year}${String(month).padStart(2, '0')}0100`

	return `${timeStamp}-${rand}`
}

async function _getCoverData<T extends BookInsert | BookUpdate>(
	coverPath: string
): Promise<Pick<T, 'cover_width' | 'cover_height'>> {
	const coverImage = await sharp(coverPath).metadata()
	const coverWidth = coverImage.width
	const coverHeight = coverImage.height

	return {
		cover_width: coverWidth,
		cover_height: coverHeight,
	}
}

class BookPiece extends Piece<typeof PieceTypes.Books, Book, BookMarkDown> {
	constructor(dir: string) {
		super(dir, PieceTypes.Books, bookMdValidator, cacheDatabaseSchema)
	}

	getCoverPath(slug: string): string {
		const assetDirectory = this.directories.assets
		return path.join(assetDirectory, BOOK_COVER_DIRECTORY, `${slug}.jpg`)
	}

	getRelativeCoverPath(slug: string): string {
		return path.join(ASSETS_DIRECTORY, BOOK_COVER_DIRECTORY, `${slug}.jpg`)
	}

	getCoverVariantPath(
		slug: string,
		widthSize: 125 | 250 | 500 | 1000,
		type: 'jpg' | 'avif' = 'jpg'
	): string {
		const assetCacheDirectory = this.directories['assets.cache']
		return path.join(assetCacheDirectory, BOOK_COVER_DIRECTORY, `${slug}.w${widthSize}.${type}`)
	}

	async toMarkDown(book: Book): Promise<BookMarkDown> {
		const bookFrontmatter: Partial<{ [key in keyof BookMarkDown['frontmatter']]: unknown }> = {}
		const bookMdFields = Object.keys({
			...bookMdSchema.properties.frontmatter.properties,
			...bookMdSchema.properties.frontmatter.optionalProperties,
		}) as Array<keyof BookMarkDown['frontmatter']>

		bookMdFields.forEach((key) => {
			const bookAttribute = book[key]
			if (bookAttribute !== null && bookAttribute !== undefined) {
				bookFrontmatter[key] = bookAttribute
			}
		})

		return toValidatedMarkDown(
			this.getFileName(book.slug),
			book.note?.toString(),
			bookFrontmatter,
			bookMdValidator
		)
	}

	async markBookAsSynced(book: Book): Promise<void> {
		const bookDbCache: Partial<{ [key in BookDatabaseOnlyFields]: unknown }> = {}
		const bookDbFields = [
			...Object.keys(cacheDatabaseSchema.properties),
			...Object.keys(cacheDatabaseSchema.optionalProperties),
		] as Array<BookDatabaseOnlyFields>

		bookDbFields.forEach((key) => {
			const bookAttribute = book[key]
			if (bookAttribute !== null && bookAttribute !== undefined) {
				bookDbCache[key] = bookAttribute
			}
		})

		await this.caches.update(book.slug, {
			lastSynced: new Date().toJSON(),
			database: bookDbCache as BookCacheSchema,
		})
	}

	async toCreateInput(slug: string, bookMd: BookMarkDown): Promise<BookInsert> {
		const bookInput = {
			...bookMd.frontmatter,
			id: createId(),
			slug,
			note: bookMd.markdown,
			read_order: _getReadOrder(bookMd.frontmatter.year_read, bookMd.frontmatter.month_read),
		}

		return await this.maybeGetCoverData<BookInsert>(slug, bookMd, bookInput)
	}

	async toUpdateInput(
		slug: string,
		bookMd: BookMarkDown,
		book: Book,
		force = false
	): Promise<BookUpdate> {
		const bookUpdateInput = {
			...bookMd.frontmatter,
			slug,
			note: bookMd.markdown,
			date_updated: new Date().getTime(),
		} as BookUpdate

		const bookKeys = Object.keys(bookUpdateInput) as Array<keyof typeof bookUpdateInput>

		// restrict updates to only fields that have changed between the md and db data
		bookKeys.forEach((field) => {
			if (!force && bookUpdateInput[field] === book[field]) {
				delete bookUpdateInput[field]
			}
		})

		if (bookUpdateInput.year_read || bookUpdateInput.month_read) {
			const year = bookMd.frontmatter.year_read
			const month = bookMd.frontmatter.month_read
			const order = _getReadOrder(year, month)
			bookUpdateInput.read_order = order
		}

		const update = await this.maybeGetCoverData(slug, bookMd, bookUpdateInput)

		return Object.keys(update).length > 0 ? update : { date_updated: new Date().getTime() }
	}

	async makeCoverThumbnails(slug: string): Promise<void> {
		const toPath = this.getCoverPath(slug)
		const coverSharp = sharp(toPath)
		const sizes = [125, 250, 500, 1000] as Array<125 | 250 | 500 | 1000>
		const types = ['jpg', 'avif'] as Array<'jpg' | 'avif'>

		// possible optimizations
		//   - don't generate if thumbnail exists AND is newer than cover
		//   -- requires getting mtime of each thumbnail and comparing to cover
		//   -- OR try and do this with json cache data

		for (const size of sizes) {
			for (const type of types) {
				const thumbnailPath = this.getCoverVariantPath(slug, size, type)
				await coverSharp.resize({ width: size }).toFile(thumbnailPath)
				log.info(`generated w${size} ${type} thumbnail for ${slug}`)
			}
		}
	}

	async downloadCover(slug: string, file: string): Promise<boolean> {
		const toPath = this.getCoverPath(slug)

		if (/https?:\/\//i.test(file)) {
			const tempFile = await downloadTo(file)
			const fileType = await fileTypeFromFile(tempFile)

			if (fileType?.ext === 'jpg') {
				await copyFile(tempFile, toPath)
				await unlink(tempFile)
				await this.makeCoverThumbnails(slug)

				log.info(`downloaded ${slug} cover at ${file}`)

				return true
			} else {
				await unlink(tempFile)
				log.warn(`${file} was not a jpg`)
			}
		} else {
			const coverStat = await stat(file).catch(() => null)

			if (coverStat && coverStat.isFile()) {
				const fileType = await fileTypeFromFile(file)

				if (fileType?.ext === 'jpg') {
					await copyFile(file, toPath)
					await this.makeCoverThumbnails(slug)

					log.info(`copied image for ${slug}`)

					return true
				} else {
					log.warn(`${file} was not a jpg`)
				}
			} else {
				log.warn(`${file} is not a file or does not exist`)
			}
		}

		return false
	}

	async completeOpenAI(apiKey: string, bookMd: BookMarkDown): Promise<BookMarkDown['frontmatter']> {
		const tags = await generateTags(apiKey, bookMd)
		const description = await generateDescription(apiKey, bookMd)

		bookMd.frontmatter.keywords = tags.join(',')
		bookMd.frontmatter.description = description

		return bookMd.frontmatter
	}

	async searchGoogleBooks(
		apiKey: string,
		bookTitle: string,
		bookAuthor: string
	): Promise<BookMarkDown['frontmatter']> {
		const volume = await findVolume(apiKey, bookTitle, bookAuthor)
		const googleBook = volume?.volumeInfo

		log.info(`searching google for ${bookTitle}`)

		if (googleBook) {
			const title = googleBook.title || bookTitle
			const subtitle = googleBook.subtitle
			const authors = googleBook.authors || []
			const author = authors[0] || bookAuthor
			const coauthors = authors.slice(1).join(',')
			const categories = googleBook.categories || []
			const keywords = categories.map((x) => x.toLowerCase())
			const pages = googleBook.pageCount
			const description = googleBook.description

			return {
				title,
				author,
				...(subtitle && { subtitle }),
				...(coauthors && { coauthors }),
				...(pages && !isNaN(pages) && { pages }),
				...(keywords.length && { keywords: keywords.join(',') }),
				...(description && { description }),
			}
		}

		throw new Error(`could not find ${bookTitle} on google books`)
	}

	async searchOpenLibrary(
		openLibraryBookId: string,
		bookSlug: string,
		bookTitle: string,
		bookAuthor: string
	): Promise<BookMarkDown['frontmatter']> {
		const book = await getOpenLibraryBook(openLibraryBookId)
		const workId = book?.works?.[0].key.replace(/\/works\//, '')
		const work = workId ? await findWork(workId) : null

		log.info(`searching openlibrary for ${bookTitle}`)

		if (book && work) {
			const title = work.title || bookTitle
			const subtitle = book.subtitle
			const author = work.author_name[0] || bookAuthor
			const coauthors = work.author_name.slice(1).join(',')
			const isbn = work.isbn?.[0]
			const publishedYear = work.first_publish_year
			const pages = Number(work.number_of_pages)
			const coverUrl = work.cover_i ? getCoverUrl(work.cover_i) : undefined

			if (coverUrl) {
				await this.downloadCover(bookSlug, coverUrl)
			}

			return {
				title,
				author,
				id_ol_work: workId,
				...(coverUrl && {
					cover_path: this.getRelativeCoverPath(bookSlug),
				}),
				...(subtitle && { subtitle }),
				...(isbn && { isbn }),
				...(coauthors && { coauthors }),
				...(pages && !isNaN(pages) && { pages }),
				...(publishedYear && { year_first_published: publishedYear }),
			}
		}

		throw new Error(`could not find ${bookTitle} on openlibrary`)
	}

	async maybeGetCoverData<T extends BookInsert | BookUpdate>(
		slug: string,
		bookMd: BookMarkDown,
		bookInput: T
	): Promise<T> {
		const coverPath = this.getCoverPath(slug)

		console.log(coverPath)

		if (bookMd.frontmatter.cover_path) {
			const coverData = await _getCoverData<T>(coverPath)

			return {
				...bookInput,
				...coverData,
			}
		}

		return bookInput
	}

	async removeStaleCache(): Promise<string[]> {
		const staleSlugs = await super.removeStaleCache()

		await eachLimit(staleSlugs, cpus().length, async (slug) => {
			const assets = this.getCoverPath(slug)
			const sizes = [125, 250, 500, 1000] as Array<125 | 250 | 500 | 1000>
			const imgTypes = ['jpg', 'avif'] as Array<'jpg' | 'avif'>
			const unlinks = []

			sizes.forEach((size) => {
				imgTypes.forEach((type) => {
					const cacheAssets = this.getCoverVariantPath(slug, size, type)
					if (existsSync(cacheAssets)) {
						unlinks.push(unlink(cacheAssets))
						log.info(`deleted stale cover for ${slug}`)
					}
				})
			})

			if (existsSync(assets)) {
				unlinks.push(unlink(assets))
				log.info(`deleted stale cover for ${slug}`)
			}

			await Promise.all(unlinks)
		})

		return staleSlugs
	}

	async attach(slug: string, file: string) {
		const pieceMarkDown = await this.get(slug)

		if (pieceMarkDown) {
			await this.downloadCover(slug, file)

			pieceMarkDown.frontmatter.cover_path = this.getRelativeCoverPath(slug)

			await this.write(slug, pieceMarkDown)
		} else {
			throw new Error(`could not find ${slug} to attach ${file} to`)
		}
	}
}

export default BookPiece
