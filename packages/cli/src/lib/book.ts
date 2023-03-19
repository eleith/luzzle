import { Book, Prisma } from './prisma'
import { eachLimit, filterLimit } from 'async'
import { copyFile, unlink, stat, writeFile } from 'fs/promises'
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
import crypto from 'crypto'
import { existsSync } from 'fs'
import {
  bookMdSchema,
  cacheDatabaseSchema,
  BookMd,
  BookDatabaseCache,
  BookDatabaseOnlyFields,
  BookMdWithOpenLib,
  bookMdValidator,
} from './book.schemas'
import Books from './books'

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

async function bookToMd(book: Book): Promise<BookMd> {
  const bookFrontmatter: Partial<{ [key in keyof BookMd['frontmatter']]: unknown }> = {}
  const bookMdFields = Object.keys({
    ...bookMdSchema.properties.frontmatter.properties,
    ...bookMdSchema.properties.frontmatter.optionalProperties,
  }) as Array<keyof BookMd['frontmatter']>

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

async function markBookAsSynced(books: Books, book: Book): Promise<void> {
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

  await books.cache.update(book.slug, {
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

async function getUpdatedSlugs(
  bookSlugs: string[],
  books: Books,
  type: 'lastProcessed' | 'lastSynced'
): Promise<string[]> {
  return filterLimit(bookSlugs, cpus().length, async (slug) => {
    const bookCache = await books.cache.get(slug)
    const bookPath = books.getPathForBook(slug)
    const fileStat = await stat(bookPath).catch(() => null)
    const lastDate = bookCache[type]

    if (fileStat) {
      if (lastDate) {
        return fileStat.mtime > new Date(lastDate)
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

async function getBook(books: Books, slug: string): Promise<BookMd | null> {
  try {
    const data = await extract(books.getPathForBook(slug))
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

async function writeBookMd(books: Books, bookMd: BookMd): Promise<void> {
  const slug = getSlugFromBookMd(bookMd)
  const bookMdString = bookMdToString(bookMd)
  const bookPath = books.getPathForBook(slug)

  await writeFile(bookPath, bookMdString)

  const cache = {
    lastProcessed: new Date().toJSON(),
  }

  await books.cache.update(slug, cache)
}

async function bookMdToBookCreateInput(
  books: Books,
  bookMd: BookMd
): Promise<Prisma.BookCreateInput> {
  const bookInput = {
    ...bookMd.frontmatter,
    slug: getSlugFromBookMd(bookMd),
    note: bookMd.markdown,
    read_order: _getReadOrder(bookMd.frontmatter.year_read, bookMd.frontmatter.month_read),
  }

  return await _private._maybeGetCoverData(books, bookMd, bookInput)
}

async function bookMdToBookUpdateInput(
  books: Books,
  bookMd: BookMd,
  book: Book
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

  return await _private._maybeGetCoverData(books, bookMd, bookUpdateInput)
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
  books: Books,
  bookMd: BookMdWithOpenLib
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
    const subjects = work.subject || []
    const places = work.place || []
    const keywords = uniq(subjects.concat(places)).map((x) => x.toLowerCase())
    const coverUrl = work.cover_i ? getCoverUrl(work.cover_i) : undefined
    const coverPath = books.getPathForBookCover(slug)

    if (coverUrl) {
      await _private._download(bookMd, coverUrl, coverPath)
    }

    return {
      title,
      author,
      id_ol_work: workId,
      ...(coverUrl && { cover_path: books.getRelativePathForBookCover(slug) }),
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

async function fetchBookMd(books: Books, bookMd: BookMd): Promise<BookMd> {
  const bookId = bookMd.frontmatter.id_ol_book

  if (bookId) {
    const openWork = await _private._searchOpenLibrary(books, bookMd as BookMdWithOpenLib)
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

async function downloadCover(books: Books, bookMd: BookMd, cover: string): Promise<BookMd> {
  const slug = getSlugFromBookMd(bookMd)
  const coverPath = books.getPathForBookCover(slug)

  await _private._download(bookMd, cover, coverPath)

  bookMd.frontmatter.cover_path = books.getRelativePathForBookCover(slug)

  return bookMd
}

async function _maybeGetCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  books: Books,
  bookMd: BookMd,
  bookInput: T
): Promise<T> {
  const slug = getSlugFromBookMd(bookMd)
  const coverPath = books.getPathForBookCover(slug)

  if (bookMd.frontmatter.cover_path) {
    const coverData = await _private._getCoverData<T>(coverPath)

    return {
      ...bookInput,
      ...coverData,
    }
  }

  return bookInput
}

async function cleanUpDerivatives(books: Books): Promise<void> {
  try {
    const bookSlugs = await books.getAllSlugs()
    const caches = await books.cache.getAllFiles()
    const staleCaches = difference(
      caches.map((cacheFile: string) => path.basename(cacheFile, '.json')),
      bookSlugs
    )

    await eachLimit(staleCaches, cpus().length, async (slug) => {
      const coverPath = books.getPathForBookCover(slug)
      await books.cache.remove(slug)

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
  _makeBookMd,
}

export {
  markBookAsSynced,
  bookToMd,
  bookMdToString,
  getBook,
  getUpdatedSlugs,
  bookMdToBookUpdateInput,
  downloadCover,
  processBookMd,
  fetchBookMd,
  writeBookMd,
  bookMdToBookCreateInput,
  getSlugFromBookMd,
  cleanUpDerivatives,
  _private,
  createBookMd,
}
