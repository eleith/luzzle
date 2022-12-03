import { Book, Prisma } from './prisma'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd'
import { eachLimit, filterLimit } from 'async'
import { copyFile, unlink, stat, readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { difference, merge, uniq } from 'lodash'
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
import crypto from 'crypto'
import { existsSync } from 'fs'

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
type BookDbOptionalFields = 'cover_width' | 'cover_height' | 'read_order'
type BookDbFields = BookDbRequiredFields | BookDbOptionalFields
type BookMdRequiredFields = 'title' | 'author'
type BookMdFields = Exclude<keyof Book, BookDbFields | 'note'>
type BookDatabaseCache = ToJsonCompatible<
  Pick<Book, BookDbRequiredFields> &
    Partial<NonNullableProperties<Pick<Book, BookDbOptionalFields>>>
>

export type BookCache = {
  lastProcessed?: string
  lastSynced?: string
  database?: BookDatabaseCache
}

export type BookMd = {
  filename: string
  markdown?: string
  frontmatter: Pick<Book, BookMdRequiredFields> &
    Partial<NonNullableProperties<Omit<Book, BookMdRequiredFields | 'note' | BookDbFields>>>
}

export type BookMdWithOpenLib = BookMd & { frontmatter: { id_ol_book: string } }

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
        cover_path: { type: 'string' },
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
    database: {
      properties: {
        id: { type: 'string' },
        date_added: { type: 'timestamp' },
        date_updated: { type: 'timestamp' },
        slug: { type: 'string' },
      },
      optionalProperties: {
        read_order: { type: 'string' },
        cover_width: { type: 'uint32' },
        cover_height: { type: 'uint32' },
      },
    },
  },
}

const ajv = new Ajv()
const bookMdValidator = ajv.compile(bookMdSchema)
const cacheValidator = ajv.compile(cacheSchema)
const cacheDir = '.cache'
const assetsDir = '.assets'
const bookCoverDir = path.join(assetsDir, 'covers')
const dbPath = path.join(assetsDir, 'data', 'sqlite.db')

function _getCoverPathForBook(slug: string, baseDir = ''): string {
  return path.join(baseDir, bookCoverDir, `${slug}.jpg`)
}

function _getCachePathForBook(slug: string, baseDir = ''): string {
  return path.join(baseDir, cacheDir, `${slug}.json`)
}

function _getPathForBook(slug: string, baseDir = ''): string {
  return path.join(baseDir, `${slug}.md`)
}

function _getReadOrder(
  year: number = new Date(1970).getFullYear(),
  month: number = new Date(1970, 1).getMonth() + 1
): string {
  const rand = crypto.randomBytes(2).toString('hex')
  const timeStamp = `${year}${String(month).padStart(2, '0')}0100`

  return `${timeStamp}-${rand}`
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

  return {}
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

  return _private._makeBookMd(book.slug, book.note?.toString(), bookFrontmatter)
}

async function createBookMd(
  title: string,
  notes: BookMd['markdown'],
  fields: BookMd['frontmatter']
): Promise<BookMd> {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  const bookMd = _private._makeBookMd(slug, notes, fields)

  return bookMd
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
    database: bookDbCache as BookDatabaseCache,
  })
}

function _makeBookMd(slug: string, markdown: unknown, frontmatter: unknown): BookMd {
  const filename = `${slug}.md`
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
    return _private._makeBookMd(slug, data.markdown, data.frontmatter)
  } catch (err) {
    log.error(err)
    return null
  }
}

/* c8 ignore next 4 */
async function processBookMd(_bookMd: BookMd): Promise<BookMd> {
  return _bookMd
}

async function writeBookMd(bookMd: BookMd, dir: string): Promise<void> {
  const slug = getSlugFromBookMd(bookMd)
  const bookMdString = bookMdToString(bookMd)
  const bookPath = _getPathForBook(slug, dir)

  await writeFile(bookPath, bookMdString)

  const cache = {
    lastProcessed: new Date().toJSON(),
  }

  await _private._updateCache(dir, slug, cache)
}

async function bookMdToBookCreateInput(
  bookMd: BookMd,
  dir: string
): Promise<Prisma.BookCreateInput> {
  const bookInput = {
    ...bookMd.frontmatter,
    slug: getSlugFromBookMd(bookMd),
    note: bookMd.markdown,
    read_order: _getReadOrder(bookMd.frontmatter.year_read, bookMd.frontmatter.month_read),
  }

  return await _private._maybeGetCoverData(bookMd, bookInput, dir)
}

async function bookMdToBookUpdateInput(
  bookMd: BookMd,
  book: Book,
  dir: string
): Promise<Prisma.BookUpdateInput> {
  const bookUpdateInput = {
    ...bookMd.frontmatter,
    slug: getSlugFromBookMd(bookMd),
    note: bookMd.markdown,
  } as Prisma.BookUpdateInput

  const bookKeys = Object.keys(bookUpdateInput) as Array<keyof typeof bookUpdateInput>

  // restrict updates to only fields that have changed between the md and db data
  bookKeys.forEach((field) => {
    if (bookUpdateInput[field] === book[field]) {
      delete bookUpdateInput[field]
    }
  })

  if (bookUpdateInput.year_read || bookUpdateInput.month_read) {
    const year = bookMd.frontmatter.year_read
    const month = bookMd.frontmatter.month_read
    const order = _getReadOrder(year, month)
    bookUpdateInput.read_order = order
  }

  return await _private._maybeGetCoverData(bookMd, bookUpdateInput, dir)
}

async function _getCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
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

async function _download(bookMd: BookMd, file: string, toPath: string): Promise<boolean> {
  const slug = getSlugFromBookMd(bookMd)

  if (/https?:\/\//i.test(file)) {
    const tempFile = await downloadTo(file)
    const fileType = await fileTypeFromFile(tempFile)

    if (fileType?.ext === 'jpg') {
      await copyFile(tempFile, toPath)
      await unlink(tempFile)

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
  const slug = getSlugFromBookMd(bookMd)

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
    const coverPath = _getCoverPathForBook(slug, dir)

    if (coverUrl) {
      await _private._download(bookMd, coverUrl, coverPath)
    }

    return {
      title,
      author,
      id_ol_work: workId,
      ...(coverUrl && { cover_path: path.relative(dir, coverPath) }),
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

async function fetchBookMd(bookMd: BookMd, dir: string): Promise<BookMd> {
  const bookId = bookMd.frontmatter.id_ol_book

  if (bookId) {
    const openWork = await _private._searchOpenLibrary(bookMd as BookMdWithOpenLib, dir)
    const googleBook = await _private._searchGoogleBooks(
      bookMd.frontmatter.title,
      bookMd.frontmatter.author
    )

    return merge({ frontmatter: openWork }, { frontmatter: googleBook }, bookMd)
  }

  const googleBook = await _private._searchGoogleBooks(
    bookMd.frontmatter.title,
    bookMd.frontmatter.author
  )

  return merge({ frontmatter: googleBook }, bookMd)
}

async function downloadCover(bookMd: BookMd, cover: string, dir: string): Promise<BookMd> {
  const slug = getSlugFromBookMd(bookMd)
  const coverPath = _getCoverPathForBook(slug, dir)

  await _private._download(bookMd, cover, coverPath)

  bookMd.frontmatter.cover_path = path.relative(dir, coverPath)

  return bookMd
}

async function _maybeGetCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  bookMd: BookMd,
  bookInput: T,
  dir: string
): Promise<T> {
  const slug = getSlugFromBookMd(bookMd)
  const coverPath = _getCoverPathForBook(slug, dir)

  if (bookMd.frontmatter.cover_path) {
    const coverData = await _private._getCoverData<T>(coverPath)

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
      caches.map((cacheFile: string) => path.basename(cacheFile, '.json')),
      bookSlugs
        .filter((bookFile) => path.extname(bookFile) === '.md')
        .map((bookFile) => path.basename(bookFile, '.md'))
    )

    await eachLimit(staleCaches, cpus().length, async (slug) => {
      const cachePath = _getCachePathForBook(slug, dir)
      const coverPath = _getCoverPathForBook(slug, dir)

      if (existsSync(cachePath)) {
        await unlink(cachePath)
        log.info(`deleted stale cache for ${slug}`)
      }

      if (existsSync(coverPath)) {
        await unlink(coverPath)
        log.info(`deleted stale cover for ${slug}`)
      }
    })
  } catch (err) {
    log.error(err)
  }
}

const _private = {
  _getCoverData,
  _maybeGetCoverData,
  _download,
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
  downloadCover,
  dbPath,
  processBookMd,
  fetchBookMd,
  writeBookMd,
  bookMdToBookCreateInput,
  getBookCache,
  getSlugFromBookMd,
  cleanUpDerivatives,
  _private,
  createBookMd,
}
