import { unlink } from 'fs/promises'
import path from 'path'
import log from '../../lib/log.js'
import { downloadToTmp } from '../../lib/web.js'
import { findVolume } from './google-books.js'
import { findWork, getBook as getOpenLibraryBook, getCoverUrl } from './open-library.js'
import crypto from 'crypto'
import { Piece, toValidatedMarkDown, PieceType } from '../../lib/pieces/index.js'
import { createId } from '@paralleldrive/cuid2'
import { generateDescription, generateTags } from './openai.js'
import { ASSETS_DIRECTORY } from '../../lib/assets.js'
import { Config } from '../../lib/config.js'
import { merge } from 'lodash-es'
import {
	BookInsertable,
	BookUpdateable,
	BookType,
	BookSelectable,
	BookMarkdown,
	bookDatabaseJtdSchema,
	bookMarkdownJtdSchema,
} from './schema.js'

const BOOK_COVER_DIRECTORY = 'covers'

function _getReadOrder(
	year: number = new Date(1970).getFullYear(),
	month: number = new Date(1970, 1).getMonth() + 1
): string {
	const rand = crypto.randomBytes(2).toString('hex')
	const timeStamp = `${year}${String(month).padStart(2, '0')}0100`

	return `${timeStamp}-${rand}`
}

class BookPiece extends Piece<BookType, BookSelectable, BookMarkdown> {
	constructor(piecesRoot: string) {
		super(piecesRoot, PieceType.Book, bookMarkdownJtdSchema, bookDatabaseJtdSchema)
	}

	getCoverPath(slug: string): string {
		const assetDirectory = this.directories.assets
		return path.join(assetDirectory, BOOK_COVER_DIRECTORY, `${slug}.jpg`)
	}

	getRelativeCoverPath(slug: string): string {
		return path.join(ASSETS_DIRECTORY, BOOK_COVER_DIRECTORY, `${slug}.jpg`)
	}

	async toCreateInput(markdown: BookMarkdown): Promise<BookInsertable> {
		const bookInput = {
			...markdown.frontmatter,
			id: createId(),
			slug: markdown.slug,
			note: markdown.markdown,
			read_order: _getReadOrder(markdown.frontmatter.year_read, markdown.frontmatter.month_read),
		}

		return bookInput
	}

	async toUpdateInput(
		bookMd: BookMarkdown,
		book: BookSelectable,
		force = false
	): Promise<BookUpdateable> {
		const bookUpdateInput = {
			...bookMd.frontmatter,
			slug: bookMd.slug,
			note: bookMd.markdown,
			date_updated: new Date().getTime(),
		} as BookUpdateable

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

		return { ...bookUpdateInput, date_updated: new Date().getTime() }
	}

	async completeOpenAI(apiKey: string, bookMd: BookMarkdown): Promise<BookMarkdown['frontmatter']> {
		const tags = await generateTags(apiKey, bookMd)
		const description = await generateDescription(apiKey, bookMd)

		log.info(`generating openAI description for ${bookMd.slug}`)

		bookMd.frontmatter.keywords = tags.join(',')
		bookMd.frontmatter.description = description

		return bookMd.frontmatter
	}

	async searchGoogleBooks(
		apiKey: string,
		bookTitle: string,
		bookAuthor: string
	): Promise<BookMarkdown['frontmatter']> {
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
	): Promise<BookMarkdown['frontmatter']> {
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

			const frontMatter: BookMarkdown['frontmatter'] = {
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

			if (coverUrl) {
				log.info(`downloading cover (${coverUrl}) for ${bookTitle}`)

				const tmpFile = await downloadToTmp(coverUrl)
				const fetchedMarkdown = await this.attach(
					tmpFile,
					{ slug: bookSlug, frontmatter: frontMatter },
					'cover_path'
				)

				await unlink(tmpFile)
				return fetchedMarkdown.frontmatter
			}

			return frontMatter
		}

		throw new Error(`could not find ${bookTitle} on openlibrary`)
	}

	async fetch(config: Config, markdown: BookMarkdown, service?: string): Promise<BookMarkdown> {
		const apiKeys = config.get('api_keys')
		const googleKey = apiKeys.google
		const openAIKey = apiKeys.openai
		const bookMd = markdown
		const bookProcessed = merge({}, bookMd)

		if (service && /google|all/.test(service)) {
			if (googleKey) {
				const googleMetadata = await this.searchGoogleBooks(
					googleKey,
					bookMd.frontmatter.title,
					bookMd.frontmatter.author
				)
				merge(bookProcessed, { frontmatter: googleMetadata })
			} else {
				log.warn('google key is not set, google books metadata will not be fetched')
			}
		}

		if (service && /openlibrary|all/.test(service)) {
			if (bookProcessed.frontmatter.id_ol_book) {
				const openLibraryMetadata = await this.searchOpenLibrary(
					bookProcessed.frontmatter.id_ol_book,
					bookProcessed.slug,
					bookProcessed.frontmatter.title,
					bookProcessed.frontmatter.author
				)
				merge(bookProcessed, { frontmatter: openLibraryMetadata })
			} else {
				log.warn('id_ol_book is not set, open library metadata will not be fetched')
			}
		}

		if (service && /openai|all/.test(service)) {
			if (openAIKey) {
				const openAIBook = await this.completeOpenAI(openAIKey, bookMd)
				merge(bookProcessed, { frontmatter: openAIBook })
			} else {
				log.warn('openai key is not set, tags and description will not be generated')
			}
		}

		return bookProcessed
	}

	create(slug: string, title: string): BookMarkdown {
		return toValidatedMarkDown(
			slug,
			'notes',
			{
				title,
				author: 'author',
				isbn: '1234',
				description: 'description',
				id_ol_book: 'id1234',
				id_ol_work: 'id5678',
				coauthors: 'coauthors',
				year_read: new Date().getFullYear(),
				month_read: new Date().getMonth() + 1,
			},
			this.validator
		)
	}

	async process(slugs: string[], dryRun = false) {
		log.info(`processing ${slugs} with dryRun: ${dryRun}`)
		return
	}
}

export default BookPiece
