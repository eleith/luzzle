import { Book, Prisma } from '@app/prisma'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { filterLimit, mapLimit } from 'async'
import { copyFile, unlink, stat, readdir } from 'fs/promises'
import { differenceWith, merge, omit, uniq } from 'lodash'
import { cpus } from 'os'
import path from 'path'
import { addFrontMatter, extract } from './md'
import log from './log'
import { downloadTo } from './web'
import { fileTypeFromFile } from 'file-type'
import { findVolume } from './google-books'
import { findWork, getBook, getCoverUrl } from './open-library'
import sharp from 'sharp'

type NonNullableProperties<T> = { [K in keyof T]: NonNullable<T[K]> }
type BookDbRequiredFields = 'slug' | 'id' | 'date_added' | 'date_updated'
type BookDbOptionalFields = 'cover_width' | 'cover_height' | 'cover_path'
type BookDbFields = BookDbRequiredFields | BookDbOptionalFields
type BookMdRequiredFields = 'title' | 'author'
type BookMdFields = Exclude<keyof Book, BookDbFields | 'note'>
type BookMdDatabaseCache = Pick<Book, BookDbRequiredFields> &
  Partial<NonNullableProperties<Pick<Book, BookDbOptionalFields>>>
type BookMdInputSearch = 'google' | 'open-library' | 'all'
type BookMdInput = {
  cover?: string
  search?: BookMdInputSearch
}
type BookMdProcessFields = '__database_cache' | '__input'

export type BookMd = {
  filename: string
  markdown?: string
  frontmatter: Pick<Book, BookMdRequiredFields> &
    Partial<NonNullableProperties<Omit<Book, BookMdRequiredFields | 'note' | BookDbFields>>> & {
      __database_cache?: BookMdDatabaseCache
    } & { __input?: BookMdInput }
}

export type BookMdWithCover = BookMd & { frontmatter: { __input: { cover: string } } }
export type BookMdWithOpenLib = BookMd & { frontmatter: { id_ol_book: string } }
export type BookMdWithSearch = BookMd & { frontmatter: { __input: { search: BookMdInputSearch } } }
export type BookMdWithDatabaseId = BookMd & { frontmatter: { __database_cache: { id: string } } }

const bookMdSpecialFields: Array<BookMdProcessFields> = ['__database_cache', '__input']

const bookMdSchema: JTDSchemaType<BookMd> = {
  properties: {
    filename: { type: 'string' },
    frontmatter: {
      properties: {
        title: { type: 'string' },
        author: { type: 'string' },
      },
      optionalProperties: {
        id_ol_book: { type: 'string' },
        id_ol_work: { type: 'string' },
        isbn: { type: 'string' },
        subtitle: { type: 'string' },
        coauthors: { type: 'string' },
        description: { type: 'string' },
        pages: { type: 'uint32' },
        year_read: { type: 'uint32' },
        month_read: { type: 'uint32' },
        year_first_published: { type: 'uint32' },
        keywords: { type: 'string' },
        __input: {
          optionalProperties: {
            cover: { type: 'string' },
            search: { enum: ['google', 'open-library', 'all'] },
          },
        },
        __database_cache: {
          properties: {
            id: { type: 'string' },
            date_added: { type: 'timestamp' },
            date_updated: { type: 'timestamp' },
            slug: { type: 'string' },
          },
          optionalProperties: {
            cover_width: { type: 'uint32' },
            cover_height: { type: 'uint32' },
            cover_path: { type: 'string' },
          },
        },
      },
    },
  },
  optionalProperties: {
    markdown: { type: 'string' },
  },
}

const ajv = new Ajv()
const bookMdValidator = ajv.compile(bookMdSchema)
const bookCoverDir = path.join('.assets', 'covers')

function getCoverPathForBook(bookMd: BookMd): string {
  const slug = path.basename(bookMd.filename, '.md')
  return path.join(bookCoverDir, `${slug}.jpg`)
}

async function bookToString(book: Book): Promise<string> {
  const bookFrontmatter: Partial<{ [key in BookMdFields]: unknown }> = {}
  const bookDbCache: Partial<{ [key in BookDbFields]: unknown }> = {}
  const bookFrontmatterSchema = bookMdSchema.properties.frontmatter
  const bookMdFields = [
    ...Object.keys(bookFrontmatterSchema.properties),
    ...Object.keys(bookFrontmatterSchema.optionalProperties),
  ] as Array<BookMdFields>
  const bookDbFields = [
    ...Object.keys(bookFrontmatterSchema.optionalProperties.__database_cache.properties),
    ...Object.keys(bookFrontmatterSchema.optionalProperties.__database_cache.optionalProperties),
  ] as Array<BookDbFields>

  bookMdFields.forEach((key) => {
    const bookAttribute = book[key]
    if (
      bookAttribute !== null &&
      bookAttribute !== undefined &&
      (bookMdSpecialFields as string[]).indexOf(key) === -1
    ) {
      bookFrontmatter[key] = bookAttribute
    }
  })

  bookDbFields.forEach((key) => {
    const bookAttribute = book[key]
    if (bookAttribute !== null && bookAttribute !== undefined) {
      bookDbCache[key] = bookAttribute
    }
  })

  return addFrontMatter(book.note?.toString(), {
    ...bookFrontmatter,
    __database_cache: bookDbCache,
  })
}

function makeBookMd(filename: string, markdown: unknown, frontmatter: unknown): BookMd {
  const bookOnDisk = {
    filename,
    frontmatter,
    markdown,
  } as BookMd

  if (bookMdValidator(bookOnDisk)) {
    return bookOnDisk
  }

  const message = bookMdValidator.errors
    ?.map((x) => {
      return `${x.instancePath} -> ${x.message}`
    })
    .join(' | ')

  throw new Error(`${filename} is not a valid bookMd, errors: ${message}`)
}

async function readBookDir(dirPath: string): Promise<Array<string>> {
  const files = await readdir(dirPath, { withFileTypes: true })
  const bookSlugs = files
    .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.md')
    .map((dirent) => path.basename(dirent.name, '.md'))

  return bookSlugs
}

async function filterRecentlyUpdatedBooks(
  bookSlugs: string[],
  books: Pick<Book, 'date_updated' | 'slug'>[],
  dir: string
): Promise<string[]> {
  return filterLimit(bookSlugs, cpus().length, async (slug) => {
    const book = books.find((book) => book.slug === slug)
    if (book) {
      const fileStat = await stat(path.join(dir, `${slug}.md`))
      return fileStat.mtime > book.date_updated
    }
    return true
  })
}

async function extractBooksOnDisk(bookSlugs: string[], dirpath: string): Promise<Array<BookMd>> {
  const bookMds = await mapLimit(bookSlugs, cpus().length, async (slug: string) => {
    try {
      const data = await extract(path.join(dirpath, `${slug}.md`))
      return makeBookMd(`${slug}.md`, data.markdown, data.frontmatter)
    } catch (err) {
      log.error('[md-extract]', err as string)
      return null
    }
  })

  return bookMds.filter((bookMd): bookMd is BookMd => bookMd !== null)
}

function findNonExistantBooks(
  bookSlugs: string[],
  booksInDb: Pick<Book, 'id' | 'slug'>[]
): Pick<Book, 'id' | 'slug'>[] {
  return differenceWith(booksInDb, bookSlugs, (book, slug) => book.slug === slug)
}

async function bookMdToBookCreateInput(
  _bookMd: BookMd,
  dir: string
): Promise<Prisma.BookCreateInput> {
  const bookMd = await _private._maybeSearch(_bookMd)
  const bookCreateInput = {
    ...omit(bookMd.frontmatter, bookMdSpecialFields),
    slug: path.basename(bookMd.filename, '.md'),
    note: bookMd.markdown,
  }

  return await _private._maybeDownloadCover<Prisma.BookCreateInput>(bookMd, bookCreateInput, dir)
}

async function bookMdToBookUpdateInput(
  _bookMd: BookMd,
  book: Book,
  dir: string
): Promise<Prisma.BookUpdateInput> {
  const bookMd = await _private._maybeSearch(_bookMd)
  const bookUpdateInput = {
    ...omit(bookMd.frontmatter, bookMdSpecialFields),
    slug: path.basename(bookMd.filename, '.md'),
    note: bookMd.markdown,
  }

  const bookKeys = Object.keys(bookUpdateInput) as Array<keyof typeof bookUpdateInput>

  // restrict updates to only fields that have changed between the md and db data
  bookKeys.forEach((field) => {
    if (bookUpdateInput[field] === book[field]) {
      delete bookUpdateInput[field]
    }
  })

  return await _private._maybeDownloadCover<Prisma.BookUpdateInput>(bookMd, bookUpdateInput, dir)
}

async function _getCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  coverPath: string
): Promise<Pick<T, 'cover_path' | 'cover_width' | 'cover_height'>> {
  const coverImage = await sharp(coverPath).metadata()
  const coverWidth = coverImage.width
  const coverHeight = coverImage.height

  return {
    cover_path: coverPath,
    cover_width: coverWidth,
    cover_height: coverHeight,
  }
}

async function _downloadCover(bookMd: BookMdWithCover, coverPath: string): Promise<void> {
  const cover = bookMd.frontmatter.__input.cover

  if (/https?:\/\//i.test(cover)) {
    const tempFile = await downloadTo(cover)
    const fileType = await fileTypeFromFile(coverPath)

    if (fileType?.ext === 'jpg') {
      await copyFile(tempFile, coverPath)
      await unlink(tempFile)

      log.info('[download]', `downloaded ${bookMd.frontmatter.title} cover at ${cover}`)
    } else {
      await unlink(tempFile)
      throw new Error("upload wasn't a jpg")
    }
  } else if (/^..\/|^\//.test(cover)) {
    const coverStat = await stat(cover)

    if (coverStat.isFile()) {
      const fileType = await fileTypeFromFile(cover)

      if (fileType?.ext === 'jpg') {
        await copyFile(cover, coverPath)

        log.info('[copy]', `copied image for ${bookMd.frontmatter.title}`)
      } else {
        throw new Error("upload wasn't a jpg")
      }
    } else {
      throw new Error("upload doesn't exist")
    }
  } else {
    throw new Error('cover is not understandable')
  }
}

async function _searchGoogleBooks(
  bookTitle: string,
  bookAuthor: string
): Promise<BookMd['frontmatter'] | null> {
  const volume = await findVolume(bookTitle, bookAuthor)
  const googleBook = volume?.volumeInfo

  log.info('[search]', `searching google for ${bookTitle}`)

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

  return null
}

async function _searchOpenLibrary(
  bookMd: BookMdWithOpenLib
): Promise<BookMd['frontmatter'] | null> {
  const book = await getBook(bookMd.frontmatter.id_ol_book)
  const workId = book?.works?.[0].key.replace(/\/works\//, '')
  const work = workId ? await findWork(workId) : null

  log.info('[search]', `searching openlibrary for ${bookMd.frontmatter.title}`)

  if (book && work) {
    const title = work.title || bookMd.frontmatter.title
    const subtitle = book.subtitle
    const author = work.author_name[0] || bookMd.frontmatter.author
    const coauthors = work.author_name.slice(1).join(',')
    const isbn = work.isbn?.[0]
    const publishedYear = work.first_publish_year
    const pages = Number(work.number_of_pages)
    const subjects = work.subject
    const places = work.place || []
    const keywords = uniq(subjects.concat(places)).map((x) => x.toLowerCase())
    const coverUrl = getCoverUrl(work.cover_i)

    return {
      title,
      author,
      id_ol_work: workId,
      ...(subtitle && { subtitle }),
      ...(isbn && { isbn }),
      ...(coauthors && { coauthors }),
      ...(pages && !isNaN(pages) && { pages }),
      ...(keywords.length && { keywords: keywords.join(',') }),
      ...(publishedYear && { year_first_published: publishedYear }),
      __input: {
        cover: coverUrl,
      },
    }
  }

  return null
}

async function _search(bookMd: BookMdWithSearch): Promise<BookMd> {
  const search = bookMd.frontmatter.__input.search
  const bookId = bookMd.frontmatter.id_ol_book

  if (bookId) {
    if (search === 'all') {
      const openWork = await _private._searchOpenLibrary(bookMd as BookMdWithOpenLib)
      const googleBook = await _private._searchGoogleBooks(
        bookMd.frontmatter.title,
        bookMd.frontmatter.author
      )

      return merge({ frontmatter: openWork }, { frontmatter: googleBook }, bookMd)
    } else if (search === 'open-library') {
      const openWork = await _private._searchOpenLibrary(bookMd as BookMdWithOpenLib)

      return merge({ frontmatter: openWork }, bookMd)
    }
  }

  //else if (search === 'google')
  const googleBook = await _private._searchGoogleBooks(
    bookMd.frontmatter.title,
    bookMd.frontmatter.author
  )

  return merge({ frontmatter: googleBook }, bookMd)
}

async function _maybeSearch(bookMd: BookMd): Promise<BookMd> {
  if (bookMd.frontmatter.__input?.search) {
    return await _private._search(bookMd as BookMdWithSearch)
  }

  return bookMd
}

async function _maybeDownloadCover<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  bookMd: BookMd,
  bookInput: T,
  outputDir: string
): Promise<T> {
  if (bookMd.frontmatter.__input?.cover) {
    const coverPath = path.join(outputDir, getCoverPathForBook(bookMd))
    await _private._downloadCover(bookMd as BookMdWithCover, coverPath)

    const coverData = await _private._getCoverData<T>(coverPath)

    return {
      ...bookInput,
      ...coverData,
    }
  }

  return bookInput
}

const _private = {
  _getCoverData,
  _maybeSearch,
  _maybeDownloadCover,
  _search,
  _downloadCover,
  _searchGoogleBooks,
  _searchOpenLibrary,
}

export {
  bookToString,
  makeBookMd,
  readBookDir,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  bookMdToBookUpdateInput,
  findNonExistantBooks,
  getCoverPathForBook,
  bookCoverDir,
  bookMdToBookCreateInput,
  _private,
}
