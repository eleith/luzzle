import { Prisma, Book } from '@app/prisma'
import { promises } from 'fs'
import { filterLimit, mapLimit } from 'async'
import path from 'path'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd'
import { extract, addFrontMatter } from './md'
import { differenceWith } from 'lodash'

type NonNullableProperties<T> = { [K in keyof T]: NonNullable<T[K]> }
export type BookMd = {
  filename: string
  frontmatter: Pick<Book, 'title' | 'author'> &
    Partial<NonNullableProperties<Omit<Book, 'title' | 'author' | 'note'>>>
  markdown?: string
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
        id: { type: 'string' },
        id_ol_book: { type: 'string' },
        id_ol_work: { type: 'string' },
        slug: { type: 'string' },
        isbn: { type: 'string' },
        subtitle: { type: 'string' },
        coauthors: { type: 'string' },
        description: { type: 'string' },
        pages: { type: 'uint32' },
        year_read: { type: 'uint32' },
        month_read: { type: 'uint32' },
        year_first_published: { type: 'uint32' },
        keywords: { type: 'string' },
        id_cover_image: { type: 'string' },
        date_added: { type: 'timestamp' },
        date_updated: { type: 'timestamp' },
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
  const bookYamlObject: { [key: string]: string | number | Date } = {}
  const bookKeys = Object.keys(book) as Array<keyof Book>
  const skipFields = ['date_added', 'date_updated', 'slug']
  const content = book.note || ''

  bookKeys.forEach((key) => {
    const bookAttribute = book[key]
    if (
      bookAttribute !== null &&
      bookAttribute !== undefined &&
      skipFields.indexOf(key) === -1 &&
      !(bookAttribute instanceof Date)
    ) {
      bookYamlObject[key] = bookAttribute
    }
  })

  return addFrontMatter(content, bookYamlObject)
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

  throw new Error('omg')
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
  const updated = await filterLimit(bookFiles, 20, async (filename) => {
    const book = books.find((book) => book.slug === filename)
    if (book) {
      const stat = await promises.stat(path.join(dirpath, `${filename}.md`))
      return stat.mtime > book.date_updated
    }
    return true
  })

  return updated.map((book) => book.slug)
}

async function extractBooksOnDisk(bookFiles: string[], dirpath: string): Promise<Array<BookMd>> {
  return mapLimit(bookFiles, 20, async (filename) => {
    const data = await extract(path.join(dirpath, `${filename}.md`))
    try {
      return makeBookMd(filename, data.markdown, data.frontmatter)
    } catch (err) {
      // log something here
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
