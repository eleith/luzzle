import { Book, Prisma } from '@app/prisma'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd'
import { filterLimit, mapLimit } from 'async'
import { promises } from 'fs'
import { differenceWith } from 'lodash'
import { cpus } from 'os'
import path from 'path'
import { addFrontMatter, extract } from './md'
import log from './log'

type NonNullableProperties<T> = { [K in keyof T]: NonNullable<T[K]> }
type BookDbRequiredFields = 'slug' | 'id' | 'date_added' | 'date_updated'
type BookDbOptionalFields = 'id_cover_image'
type BookDbFields = BookDbRequiredFields | BookDbOptionalFields
type BookMdRequiredFields = 'title' | 'author'
type BookMdFields = Exclude<keyof Book, BookDbFields | 'note'>

export type BookMd = {
  filename: string
  markdown?: string
  frontmatter: Pick<Book, BookMdRequiredFields> &
    Partial<NonNullableProperties<Omit<Book, BookMdRequiredFields | 'note' | BookDbFields>>> & {
      __database_cache?: Pick<Book, BookDbRequiredFields> &
        Partial<NonNullableProperties<Pick<Book, BookDbOptionalFields>>>
    }
}

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
        __database_cache: {
          properties: {
            id: { type: 'string' },
            date_added: { type: 'timestamp' },
            date_updated: { type: 'timestamp' },
            slug: { type: 'string' },
          },
          optionalProperties: {
            id_cover_image: { type: 'string' },
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

async function bookToString(book: Book): Promise<string> {
  const bookFrontmatter: Partial<{ [key in BookMdFields]: unknown }> = {}
  const bookDbCache: Partial<{ [key in BookDbFields]: unknown }> = {}
  const bookFrontmatterSchema = bookMdSchema.properties.frontmatter
  const bookMdFields = [
    ...Object.keys(bookFrontmatterSchema.properties),
    ...Object.keys(bookFrontmatterSchema.optionalProperties),
  ].filter((key) => key !== '__database_cache') as Array<BookMdFields>
  const bookDbFields = [
    ...Object.keys(bookFrontmatterSchema.optionalProperties.__database_cache.properties),
    ...Object.keys(bookFrontmatterSchema.optionalProperties.__database_cache.optionalProperties),
  ] as Array<BookDbFields>

  bookMdFields.forEach((key) => {
    const bookAttribute = book[key]
    if (bookAttribute !== null && bookAttribute !== undefined) {
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
  const bookFiles = files
    .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.md')
    .map((dirent) => path.basename(dirent.name))

  return bookFiles
}

async function filterRecentlyUpdatedBooks(
  bookFiles: string[],
  books: Pick<Book, 'date_updated' | 'slug'>[],
  dirpath: string
): Promise<string[]> {
  const updated = await filterLimit(bookFiles, cpus().length, async (filename) => {
    const book = books.find((book) => book.slug === filename)
    if (book) {
      const stat = await promises.stat(path.join(dirpath, `${filename}.md`))
      return stat.mtime > book.date_updated
    }
    return true
  })

  return updated
}

async function extractBooksOnDisk(bookFiles: string[], dirpath: string): Promise<Array<BookMd>> {
  return mapLimit(bookFiles, cpus().length, async (filename) => {
    const data = await extract(path.join(dirpath, `${filename}.md`))
    try {
      return makeBookMd(filename, data.markdown, data.frontmatter)
    } catch (err) {
      log.error('[md-extract]', err as string)
    }
  })
}

function findNonExistantBooks(
  bookFiles: string[],
  booksInDb: Pick<Book, 'id' | 'slug'>[]
): Pick<Book, 'id' | 'slug'>[] {
  return differenceWith(booksInDb, bookFiles, (book, slug) => book.slug === slug)
}

function bookOnDiskToBookCreateInput(bookOnDisk: BookMd): Prisma.BookCreateInput {
  const stripCreateFields: Array<keyof Prisma.BookCreateInput> = [
    'id',
    'date_added',
    'date_updated',
    'slug',
  ]
  const bookCreateInput = {
    ...bookOnDisk.frontmatter,
    slug: bookOnDisk.filename,
  } as Prisma.BookCreateInput

  stripCreateFields.forEach((field) => {
    delete bookCreateInput[field]
  })

  if (bookOnDisk.markdown) {
    bookCreateInput.note = bookOnDisk.markdown
  }

  return bookCreateInput
}

function bookOnDiskToBookUpdateInput(bookOnDisk: BookMd, book: Book): Prisma.BookUpdateInput {
  const stripUpdateFields: Array<keyof Prisma.BookUpdateInput> = [
    'id',
    'date_added',
    'date_updated',
    'slug',
  ]
  const bookUpdateInput = {
    ...bookOnDisk.frontmatter,
    slug: bookOnDisk.filename,
  } as Prisma.BookUpdateInput

  stripUpdateFields.forEach((field) => {
    delete bookUpdateInput[field]
  })

  const bookKeys = Object.keys(bookUpdateInput) as Array<keyof Prisma.BookUpdateInput>

  bookKeys.forEach((field) => {
    if (bookUpdateInput[field] === book[field]) {
      delete bookUpdateInput[field]
    }
  })

  if (bookOnDisk.markdown) {
    bookUpdateInput.note = bookOnDisk.markdown
  }

  return bookUpdateInput
}

export {
  bookToString,
  makeBookMd,
  readBookDir,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  bookOnDiskToBookUpdateInput,
  bookOnDiskToBookCreateInput,
  findNonExistantBooks,
}
