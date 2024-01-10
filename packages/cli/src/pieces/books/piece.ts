import log from '../../lib/log.js'
import { findVolume } from './google-books.js'
import { findWork, getBook as getOpenLibraryBook, getCoverUrl } from './open-library.js'
import { Piece, toValidatedMarkdown, PieceType } from '../../lib/pieces/index.js'
import { generateDescription, generateTags } from './openai.js'
import { Config } from '../../lib/config.js'
import { merge } from 'lodash-es'
import {
	BookType,
	BookSelectable,
	BookFrontmatter,
	bookDatabaseJtdSchema,
	bookFrontmatterJtdSchema,
} from './schema.js'
import { PieceMarkdown } from 'src/lib/pieces/markdown.js'

class BookPiece extends Piece<BookType, BookSelectable, BookFrontmatter> {
	constructor(piecesRoot: string) {
		super(piecesRoot, PieceType.Book, bookFrontmatterJtdSchema, bookDatabaseJtdSchema)
	}

	async completeOpenAI(
		apiKey: string,
		markdown: PieceMarkdown<BookFrontmatter>
	): Promise<BookFrontmatter> {
		const tags = await generateTags(apiKey, markdown)
		const description = await generateDescription(apiKey, markdown)
		const frontmatter = { ...markdown.frontmatter }

		log.info(`generating openAI description for ${markdown.slug}`)

		frontmatter.keywords = tags.join(',')
		frontmatter.description = description

		return frontmatter
	}

	async searchGoogleBooks(
		apiKey: string,
		bookTitle: string,
		bookAuthor: string
	): Promise<BookFrontmatter> {
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
		bookTitle: string,
		bookAuthor: string
	): Promise<BookFrontmatter> {
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
			const cover = work.cover_i ? getCoverUrl(work.cover_i) : undefined

			const frontMatter: BookFrontmatter = {
				title,
				author,
				id_ol_work: workId,
				...(cover && { cover }),
				...(subtitle && { subtitle }),
				...(isbn && { isbn }),
				...(coauthors && { coauthors }),
				...(pages && !isNaN(pages) && { pages }),
				...(publishedYear && { year_first_published: publishedYear }),
			}

			return frontMatter
		}

		throw new Error(`could not find ${bookTitle} on openlibrary`)
	}

	async fetch(
		config: Config,
		markdown: PieceMarkdown<BookFrontmatter>,
		service?: string
	): Promise<PieceMarkdown<BookFrontmatter>> {
		const apiKeys = config.get('api_keys')
		const googleKey = apiKeys.google
		const openAIKey = apiKeys.openai
		const bookProcessed = merge({}, markdown)

		if (service && /google|all/.test(service)) {
			if (googleKey) {
				const googleMetadata = await this.searchGoogleBooks(
					googleKey,
					markdown.frontmatter.title,
					markdown.frontmatter.author
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
				const openAIBook = await this.completeOpenAI(openAIKey, markdown)
				merge(bookProcessed, { frontmatter: openAIBook })
			} else {
				log.warn('openai key is not set, tags and description will not be generated')
			}
		}

		return this.internalizeAssetPathFor(bookProcessed, 'cover')
	}

	create(slug: string, title: string): PieceMarkdown<BookFrontmatter> {
		const markdown: BookFrontmatter = {
			title,
			author: 'author',
			isbn: '1234',
			description: 'description',
			id_ol_book: 'id1234',
			id_ol_work: 'id5678',
			coauthors: 'coauthors',
			date_read: new Date().toLocaleDateString(),
		}

		return toValidatedMarkdown(slug, 'notes', markdown, this.validator)
	}

	/* c8 ignore next 24 */
	async process(_: Config, slugs: string[]): Promise<void> {
		for (const slug of slugs) {
			const markdown = await this.get(slug, false)

			if (markdown) {
				const frontmatter = markdown.frontmatter
				const oldFrontmatter = frontmatter as unknown as typeof frontmatter & {
					year_read?: number
					month_read?: number
				}
				const year = oldFrontmatter.year_read
				const month = oldFrontmatter.month_read

				if (month !== undefined && year !== undefined) {
					markdown.frontmatter.date_read = `${month}-01-${year}`
				}

				delete oldFrontmatter.year_read
				delete oldFrontmatter.month_read

				await this.write(markdown)
			}
		}
	}
}

export default BookPiece
