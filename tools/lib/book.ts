import { Book, Prisma } from '@app/prisma'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { eachLimit, filterLimit } from 'async'
import { copyFile, unlink, stat, readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { difference, merge, omit, uniq } from 'lodash'
import { cpus } from 'os'
import path from 'path'
import { addFrontMatter, extract } from './md'
import log from './log'
import { downloadTo } from './web'
import { fileTypeFromFile } from 'file-type'
import { findVolume } from './google-books'
import { findWork, getBook as getOpenLibraryBook, getCoverUrl } from './open-library'
import sharp from 'sharp'
import deepmerge from 'deepmerge'

type Timestamp = string
type ToJsonCompatible<T> = T extends Date
  ? Timestamp
  : T extends Array<infer Item>
  ? Array<ToJsonCompatible<Item>>
  : T extends Record<string, unknown>
  ? { [Key in keyof T]: ToJsonCompatible<T[Key]> }
  : T
type NonNullableProperties<T> = { [K in keyof T]: NonNullable<T[K]> }
type BookDbRequiredFields = 'slug' | 'id' | 'date_added' | 'date_updated'
type BookDbOptionalFields = 'cover_width' | 'cover_height' | 'cover_path'
type BookDbFields = BookDbRequiredFields | BookDbOptionalFields
type BookMdRequiredFields = 'title' | 'author'
type BookMdFields = Exclude<keyof Book, BookDbFields | 'note'>
type BookMdDatabaseCache = ToJsonCompatible<
  Pick<Book, BookDbRequiredFields> &
    Partial<NonNullableProperties<Pick<Book, BookDbOptionalFields>>>
>
type BookMdInputSearch = 'google' | 'open-library' | 'all'
type BookMdInputFields = ['__input_search', '__input_cover']

export type BookCache = {
  lastProcessed?: string
  lastSynced?: string
  hasCover?: boolean
  database?: BookMdDatabaseCache
}

export type BookMd = {
  filename: string
  markdown?: string
  frontmatter: Pick<Book, BookMdRequiredFields> &
    Partial<NonNullableProperties<Omit<Book, BookMdRequiredFields | 'note' | BookDbFields>>> & {
      __input_cover?: string
      __input_search?: BookMdInputSearch
    }
}

export type BookMdWithOpenLib = BookMd & { frontmatter: { id_ol_book: string } }

const bookMdSpecialFields: BookMdInputFields = ['__input_search', '__input_cover']

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
        __input_cover: { type: 'string' },
        __input_search: { enum: ['google', 'open-library', 'all'] },
      },
    },
  },
  optionalProperties: {
    markdown: { type: 'string' },
  },
}

const cacheSchema: JTDSchemaType<BookCache> = {
  properties: {},
  optionalProperties: {
    lastProcessed: {
      type: 'timestamp',
    },
    lastSynced: {
      type: 'timestamp',
    },
    hasCover: {
      type: 'boolean',
    },
    database: {
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
}

const ajv = new Ajv()
const bookMdValidator = ajv.compile(bookMdSchema)
const cacheValidator = ajv.compile(cacheSchema)
const bookCoverDir = path.join('.assets', 'covers')
const cacheDir = '.cache'

function _getCoverPathForBook(slug: string, baseDir = ''): string {
  return path.join(baseDir, bookCoverDir, `${slug}.jpg`)
}

function _getCachePathForBook(slug: string, baseDir = ''): string {
  return path.join(baseDir, cacheDir, `${slug}.json`)
}

function _getPathForBook(slug: string, baseDir = ''): string {
  return path.join(baseDir, `${slug}.md`)
}

function bookMdToString(bookMd: BookMd): string {
  return addFrontMatter(bookMd.markdown, bookMd.frontmatter)
}

async function _updateCache(
  dir: string,
  slug: string,
  cacheUpdate: Partial<BookCache> = {}
): Promise<void> {
  const cacheNow = await _private._getBookCache(dir, slug)
  const cacheFilePath = _getCachePathForBook(slug, dir)
  const cache = deepmerge(cacheNow, cacheUpdate)
  const cacheString = JSON.stringify(cache, null, 2)

  await mkdir(path.dirname(cacheFilePath), { recursive: true })
  await writeFile(cacheFilePath, cacheString)
}

async function getBookCache(dir: string, slug: string): Promise<BookCache> {
  const cacheFilePath = _getCachePathForBook(slug, dir)

  try {
    const cacheString = await readFile(cacheFilePath, 'utf-8')
    const cache = JSON.parse(cacheString)

    if (cache) {
      if (cacheValidator(cache)) {
        return cache
      }
      log.warn(`${cacheFilePath} is corrupted and will be rebuilt`)
    }
  } catch (e) {
    log.warn(`${cacheFilePath} was not found and will be added`)
  }

  const coverStat = await stat(_getCoverPathForBook(slug, dir)).catch(() => null)

  return {
    hasCover: coverStat !== null,
  }
}

async function bookToMd(book: Book): Promise<BookMd> {
  const bookFrontmatter: Partial<{ [key in BookMdFields]: unknown }> = {}
  const bookFrontmatterSchema = bookMdSchema.properties.frontmatter
  const bookMdFields = [
    ...Object.keys(bookFrontmatterSchema.properties),
    ...Object.keys(bookFrontmatterSchema.optionalProperties),
  ] as Array<BookMdFields>

  bookMdFields.forEach((key) => {
    const bookAttribute = book[key]
    if (bookAttribute !== null && bookAttribute !== undefined) {
      bookFrontmatter[key] = bookAttribute
    }
  })

  return _private._makeBookMd(`${book.slug}.md`, book.note?.toString(), bookFrontmatter)
}

async function cacheBook(book: Book, dir: string): Promise<void> {
  const bookDbCache: Partial<{ [key in BookDbFields]: unknown }> = {}
  const bookDbFields = [
    ...Object.keys(cacheSchema.optionalProperties.database.properties),
    ...Object.keys(cacheSchema.optionalProperties.database.optionalProperties),
  ] as Array<BookDbFields>

  bookDbFields.forEach((key) => {
    const bookAttribute = book[key]
    if (bookAttribute !== null && bookAttribute !== undefined) {
      bookDbCache[key] = bookAttribute
    }
  })

  await _private._updateCache(dir, book.slug, {
    lastSynced: new Date().toJSON(),
    database: bookDbCache as BookMdDatabaseCache,
  })
}

function _makeBookMd(filename: string, markdown: unknown, frontmatter: unknown): BookMd {
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

async function getUpdatedSlugs(
  bookSlugs: string[],
  dir: string,
  type: 'lastProcessed' | 'lastSynced'
): Promise<string[]> {
  return filterLimit(bookSlugs, cpus().length, async (slug) => {
    const bookCache = await _private._getBookCache(dir, slug)
    const bookPath = _getPathForBook(slug, dir)
    const fileStat = await stat(bookPath).catch(() => null)

    if (fileStat) {
      if (bookCache[type]) {
        return fileStat.mtime > new Date(bookCache[type] as string)
      } else {
        return true
      }
    } else {
      log.error(`could not get stat on ${bookPath}`)
    }

    return false
  })
}

function getSlugFromBookMd(bookMd: BookMd): string {
  return path.basename(bookMd.filename, '.md')
}

async function getBook(slug: string, dir: string): Promise<BookMd | null> {
  try {
    const data = await extract(_getPathForBook(slug, dir))
    return _private._makeBookMd(`${slug}.md`, data.markdown, data.frontmatter)
  } catch (err) {
    log.error(err)
    return null
  }
}

async function processBookMd(_bookMd: BookMd, dir: string): Promise<BookMd> {
  const bookMd = await _private._maybeSearch(_bookMd, dir)

  return await _private._maybeDownloadCover(bookMd, dir)
}

async function updateBookMd(bookMd: BookMd, dir: string): Promise<void> {
  const slug = getSlugFromBookMd(bookMd)
  const bookMdString = bookMdToString(bookMd)
  const bookPath = _getPathForBook(slug, dir)
  const coverPath = _getCoverPathForBook(slug, dir)

  await writeFile(bookPath, bookMdString)

  const fileStat = await stat(bookPath).catch(() => null)

  if (fileStat) {
    const coverFileStat = await stat(coverPath).catch(() => null)
    const cache: BookCache = {
      lastProcessed: new Date().toJSON(),
    }

    if (coverFileStat) {
      cache.hasCover = true
    }

    await _private._updateCache(dir, slug, cache)
  }
}

async function bookMdToBookCreateInput(
  bookMd: BookMd,
  dir: string
): Promise<Prisma.BookCreateInput> {
  const bookInput = {
    ...omit(bookMd.frontmatter, bookMdSpecialFields),
    slug: getSlugFromBookMd(bookMd),
    note: bookMd.markdown,
  }

  return await _private._maybeGetCoverData(bookMd, bookInput, dir)
}

async function bookMdToBookUpdateInput(
  bookMd: BookMd,
  book: Book,
  dir: string
): Promise<Prisma.BookUpdateInput> {
  const bookUpdateInput = {
    ...omit(bookMd.frontmatter, bookMdSpecialFields),
    slug: getSlugFromBookMd(bookMd),
    note: bookMd.markdown,
  }

  const bookKeys = Object.keys(bookUpdateInput) as Array<keyof typeof bookUpdateInput>

  // restrict updates to only fields that have changed between the md and db data
  bookKeys.forEach((field) => {
    if (bookUpdateInput[field] === book[field]) {
      delete bookUpdateInput[field]
    }
  })

  return await _private._maybeGetCoverData(bookMd, bookUpdateInput, dir)
}

async function _getCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  coverPath: string,
  dir: string
): Promise<Pick<T, 'cover_path' | 'cover_width' | 'cover_height'>> {
  const coverImage = await sharp(coverPath).metadata()
  const coverWidth = coverImage.width
  const coverHeight = coverImage.height

  return {
    cover_path: path.relative(dir, coverPath),
    cover_width: coverWidth,
    cover_height: coverHeight,
  }
}

async function _downloadCover(bookMd: BookMd, dir: string, cover: string): Promise<boolean> {
  const slug = getSlugFromBookMd(bookMd)
  const coverPath = _getCoverPathForBook(slug, dir)

  if (/https?:\/\//i.test(cover)) {
    const tempFile = await downloadTo(cover)
    const fileType = await fileTypeFromFile(tempFile)

    if (fileType?.ext === 'jpg') {
      await copyFile(tempFile, coverPath)
      await unlink(tempFile)

      log.info(`downloaded ${slug} cover at ${cover}`)

      return true
    } else {
      await unlink(tempFile)
      log.warn(`${cover} was not a jpg`)
    }
  } else {
    const coverStat = await stat(cover).catch(() => null)

    if (coverStat && coverStat.isFile()) {
      const fileType = await fileTypeFromFile(cover)

      if (fileType?.ext === 'jpg') {
        await copyFile(cover, coverPath)

        log.info(`copied image for ${slug}`)

        return true
      } else {
        log.warn(`${cover} was not a jpg`)
      }
    } else {
      log.warn(`${cover} is not a file or does not exist`)
    }
  }

  return false
}

async function _searchGoogleBooks(
  bookTitle: string,
  bookAuthor: string
): Promise<BookMd['frontmatter'] | null> {
  const volume = await findVolume(bookTitle, bookAuthor)
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

  return null
}

async function _searchOpenLibrary(
  bookMd: BookMdWithOpenLib,
  dir: string
): Promise<BookMd['frontmatter'] | null> {
  const book = await getOpenLibraryBook(bookMd.frontmatter.id_ol_book)
  const workId = book?.works?.[0].key.replace(/\/works\//, '')
  const work = workId ? await findWork(workId) : null

  log.info(`searching openlibrary for ${bookMd.frontmatter.title}`)

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

    if (coverUrl) {
      await _private._downloadCover(bookMd, dir, coverUrl)
    }

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
    }
  }

  return null
}

async function _search(bookMd: BookMd, search: BookMdInputSearch, dir: string): Promise<BookMd> {
  const bookId = bookMd.frontmatter.id_ol_book

  if (bookId) {
    if (search === 'all') {
      const openWork = await _private._searchOpenLibrary(bookMd as BookMdWithOpenLib, dir)
      const googleBook = await _private._searchGoogleBooks(
        bookMd.frontmatter.title,
        bookMd.frontmatter.author
      )

      return merge({ frontmatter: openWork }, { frontmatter: googleBook }, bookMd)
    } else if (search === 'open-library') {
      const openWork = await _private._searchOpenLibrary(bookMd as BookMdWithOpenLib, dir)

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

async function _maybeSearch(bookMd: BookMd, dir: string): Promise<BookMd> {
  if (bookMd.frontmatter.__input_search) {
    const search = bookMd.frontmatter.__input_search
    delete bookMd.frontmatter.__input_search

    return await _private._search(bookMd, search, dir)
  }

  return bookMd
}

async function _maybeDownloadCover(bookMd: BookMd, dir: string): Promise<BookMd> {
  if (bookMd.frontmatter.__input_cover) {
    const cover = bookMd.frontmatter.__input_cover
    const downloaded = await _private._downloadCover(bookMd, dir, cover)

    if (downloaded) {
      delete bookMd.frontmatter.__input_cover
    }
  }

  return bookMd
}

async function _maybeGetCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  bookMd: BookMd,
  bookInput: T,
  dir: string
): Promise<T> {
  const slug = getSlugFromBookMd(bookMd)
  const coverPath = _getCoverPathForBook(slug, dir)
  const cache = await _private._getBookCache(dir, slug)

  if (cache.hasCover) {
    const coverData = await _private._getCoverData<T>(coverPath, dir)

    return {
      ...bookInput,
      ...coverData,
    }
  }

  return bookInput
}

async function cleanUpDerivatives(dir: string): Promise<void> {
  try {
    const bookSlugs = await readdir(dir).catch(() => [])
    const caches = await readdir(path.join(dir, cacheDir)).catch(() => [])
    const staleCaches = difference(
      caches.map((cacheFile) => path.basename(cacheFile, '.json')),
      bookSlugs
        .filter((bookFile) => path.extname(bookFile) === '.md')
        .map((bookFile) => path.basename(bookFile, '.md'))
    )

    await eachLimit(staleCaches, cpus().length, async (slug) => {
      const cache = await _private._getBookCache(dir, slug)

      await unlink(_getCachePathForBook(slug, dir))

      log.info(`deleted stale cache for ${slug}`)

      if (cache.hasCover) {
        await unlink(_getCoverPathForBook(slug, dir))
        log.info(`deleted stale cover for ${slug}`)
      }
    })
  } catch (err) {
    log.error(err)
  }
}

const _private = {
  _getCoverData,
  _maybeSearch,
  _maybeDownloadCover,
  _maybeGetCoverData,
  _search,
  _downloadCover,
  _searchGoogleBooks,
  _searchOpenLibrary,
  _updateCache,
  _getBookCache: getBookCache,
  _makeBookMd,
}

export {
  bookToMd,
  bookMdToString,
  cacheBook,
  readBookDir,
  getBook,
  getUpdatedSlugs,
  bookMdToBookUpdateInput,
  bookCoverDir,
  processBookMd,
  updateBookMd,
  bookMdToBookCreateInput,
  getBookCache,
  getSlugFromBookMd,
  cleanUpDerivatives,
  _private,
}
