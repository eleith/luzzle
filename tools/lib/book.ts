import { Book, Prisma } from '@app/prisma'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { filterLimit, mapLimit } from 'async'
import { existsSync, promises } from 'fs'
import { differenceWith, merge, omit, uniq } from 'lodash'
import { cpus } from 'os'
import path, { extname } from 'path'
import { addFrontMatter, extract } from './md'
import log from './log'
import { downloadTo } from './web'
import { fromFile } from 'file-type'
import { findVolume } from './google-books'
import { getCoverUrl, getWorkFromBook } from './open-library'
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

  return addFrontMatter(book.note || '', { ...bookFrontmatter, __database_cache: bookDbCache })
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

  throw new Error(`${filename} is not a valid bookMd`)
}

async function readBookDir(dirPath: string): Promise<Array<string>> {
  const files = await promises.readdir(dirPath, { withFileTypes: true })
  const bookSlugs = files
    .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.md')
    .map((dirent) => path.basename(dirent.name, '.md'))

  return bookSlugs
}

async function filterRecentlyUpdatedBooks(
  bookSlugs: string[],
  books: Pick<Book, 'date_updated' | 'slug'>[],
  dirpath: string
): Promise<string[]> {
  const updated = await filterLimit(bookSlugs, cpus().length, async (slug) => {
    const book = books.find((book) => book.slug === slug)
    if (book) {
      const stat = await promises.stat(path.join(dirpath, `${slug}.md`))
      return stat.mtime > book.date_updated
    }
    return true
  })

  return updated
}

async function extractBooksOnDisk(bookSlugs: string[], dirpath: string): Promise<Array<BookMd>> {
  return mapLimit(bookSlugs, cpus().length, async (slug) => {
    const data = await extract(path.join(dirpath, `${slug}.md`))
    try {
      return makeBookMd(`${slug}.md`, data.markdown, data.frontmatter)
    } catch (err) {
      log.error('[md-extract]', err as string)
    }
  })
}

function findNonExistantBooks(
  bookSlugs: string[],
  booksInDb: Pick<Book, 'id' | 'slug'>[]
): Pick<Book, 'id' | 'slug'>[] {
  return differenceWith(booksInDb, bookSlugs, (book, slug) => book.slug === slug)
}

async function getBookCoverData<T extends Prisma.BookCreateInput | Prisma.BookUpdateInput>(
  bookMd: BookMd,
  dir: string
): Promise<Pick<T, 'cover_path' | 'cover_width' | 'cover_height'>> {
  const coverPath = getCoverPathForBook(bookMd)
  const coverImage = await sharp(path.join(dir, coverPath)).metadata()
  const coverWidth = coverImage.width?.valueOf()
  const coverHeight = coverImage.height?.valueOf()

  return {
    cover_path: coverPath,
    cover_width: coverWidth,
    cover_height: coverHeight,
  }
}

async function bookMdToBookCreateInput(
  _bookMd: BookMd,
  dir: string
): Promise<Prisma.BookCreateInput> {
  const bookMd = await processInputs(_bookMd, dir)
  const cover = bookMd.frontmatter.__input?.cover
  const bookCreateInput = {
    ...omit(bookMd.frontmatter, bookMdSpecialFields),
    slug: path.basename(bookMd.filename, '.md'),
    note: bookMd.markdown || '',
  }

  if (cover) {
    const coverData = await getBookCoverData<Prisma.BookCreateInput>(bookMd, dir)

    return {
      ...bookCreateInput,
      ...coverData,
    }
  }

  return bookCreateInput
}

async function bookMdToBookUpdateInput(
  _bookMd: BookMd,
  book: Book,
  dir: string
): Promise<Prisma.BookUpdateInput> {
  const bookMd = await processInputs(_bookMd, dir)
  const cover = bookMd.frontmatter.__input?.cover
  const bookUpdateInput = {
    ...omit(bookMd.frontmatter, bookMdSpecialFields),
    slug: path.basename(bookMd.filename, '.md'),
    note: bookMd.markdown || '',
  }

  const bookKeys = Object.keys(bookUpdateInput) as Array<keyof typeof bookUpdateInput>

  // restrict updates to only fields that have changed between the md and db data
  bookKeys.forEach((field) => {
    if (bookUpdateInput[field] === book[field]) {
      delete bookUpdateInput[field]
    }
  })

  if (cover) {
    const coverData = await getBookCoverData<Prisma.BookUpdateInput>(bookMd, dir)

    return {
      ...bookUpdateInput,
      ...coverData,
    }
  }

  return bookUpdateInput
}

function getCoverPathForBook(bookMd: BookMd): string {
  const slug = path.basename(bookMd.filename, '.md')
  return path.join(bookCoverDir, `${slug}.jpg`)
}

async function downloadCover(
  bookMd: BookMd & { frontmatter: { __input: { cover: string } } },
  outputDir: string
): Promise<void> {
  const cover = bookMd.frontmatter.__input?.cover
  const outputPath = path.join(outputDir, getCoverPathForBook(bookMd))

  if (/https?:\/\//i.test(cover)) {
    const tempFile = await downloadTo(cover)

    if (extname(tempFile) === '.jpg') {
      await promises.copyFile(tempFile, outputPath)
      await promises.unlink(tempFile)
    } else {
      await promises.unlink(tempFile)
      throw new Error("upload wasn't a jpg")
    }
  } else if (cover.startsWith('/') || cover.startsWith('../')) {
    const uploadPath = path.resolve(outputDir, cover)
    if (existsSync(uploadPath)) {
      const fileType = await fromFile(cover)

      if (fileType?.ext === 'jpg') {
        await promises.copyFile(cover, outputPath)
      } else {
        throw new Error("upload wasn't a jpg")
      }
    } else {
      throw new Error("upload doesn't exist")
    }
  }

  throw new Error('cover is not understandable')
}

async function searchGoogleBooks(
  bookTitle: string,
  bookAuthor: string
): Promise<BookMd['frontmatter'] | null> {
  const volume = await findVolume(bookTitle, bookAuthor)
  const googleBook = volume?.volumeInfo

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
      description,
      ...(subtitle && { subtitle }),
      ...(coauthors && { coauthors }),
      ...(pages && !isNaN(pages) && { pages }),
      ...(keywords.length && { keywords: keywords.join(',') }),
      ...(description && { description }),
    }
  }

  return null
}

async function searchOpenLibrary(
  bookMd: BookMd & { frontmatter: { id_ol_book: string } }
): Promise<BookMd['frontmatter'] | null> {
  const work = await getWorkFromBook(bookMd.frontmatter.id_ol_book)

  if (work) {
    const title = work.title || bookMd.frontmatter.title
    const subtitle = work.subtitle
    const author = work.author_name[0] || bookMd.frontmatter.author
    const coauthors = work.author_name.slice(1).join(',')
    const isbn = work.isbn?.[0]
    const publishedYear = work.first_publish_year
    const pages = Number(work.number_of_pages)
    const subjects = work.subject || []
    const places = work.place
    const keywords = uniq([...subjects, ...places]).map((x) => x.toLowerCase())
    const coverUrl = getCoverUrl(work.cover_i)

    return {
      title,
      author,
      id_ol_work: work.workId,
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

async function processSearch(
  bookMd: BookMd & { frontmatter: { __input: { search: 'all' | 'open-library' | 'google' } } }
): Promise<BookMd> {
  const search = bookMd.frontmatter.__input.search
  const bookId = bookMd.frontmatter.id_ol_book

  if (bookId && search === 'all') {
    const openWork = await searchOpenLibrary(
      bookMd as BookMd & { frontmatter: { id_ol_book: string } }
    )
    const googleBook = await searchGoogleBooks(bookMd.frontmatter.title, bookMd.frontmatter.author)

    return merge({ frontmatter: openWork }, { frontmatter: googleBook }, bookMd)
  } else if (bookId && search === 'open-library') {
    const openWork = await searchOpenLibrary(
      bookMd as BookMd & { frontmatter: { id_ol_book: string } }
    )

    return merge({ frontmatter: openWork }, bookMd)
  } else if (search == 'google') {
    const googleBook = await searchGoogleBooks(bookMd.frontmatter.title, bookMd.frontmatter.author)

    return merge({ frontmatter: googleBook }, bookMd)
  }

  return bookMd
}

async function processInputs(bookMd: BookMd, outputDir: string): Promise<BookMd> {
  let bookMdProcessed = bookMd

  if (bookMd.frontmatter.__input?.search) {
    bookMdProcessed = await processSearch(
      bookMd as BookMd & { frontmatter: { __input: { search: BookMdInputSearch } } }
    )
  }

  if (bookMd.frontmatter.__input?.cover) {
    await downloadCover(
      bookMd as BookMd & { frontmatter: { __input: { cover: string } } },
      outputDir
    )
  }

  return bookMdProcessed
}

export {
  downloadCover,
  bookToString,
  makeBookMd,
  readBookDir,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  bookMdToBookUpdateInput,
  bookMdToBookCreateInput,
  findNonExistantBooks,
  getCoverPathForBook,
  bookCoverDir
}
