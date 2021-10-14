import { Book, Prisma } from '@app/prisma'
import Ajv, { JTDSchemaType } from 'ajv/dist/jtd.js'
import { filterLimit, mapLimit } from 'async'
import { existsSync, promises } from 'fs'
import { differenceWith, omit } from 'lodash'
import { cpus } from 'os'
import path, { extname } from 'path'
import { addFrontMatter, extract } from './md'
import log from './log'
import { downloadTo } from './web'
import { fromFile } from 'file-type'

type NonNullableProperties<T> = { [K in keyof T]: NonNullable<T[K]> }
type BookDbRequiredFields = 'slug' | 'id' | 'date_added' | 'date_updated'
type BookDbOptionalFields = 'cover_width' | 'cover_height' | 'cover_path'
type BookDbFields = BookDbRequiredFields | BookDbOptionalFields
type BookMdRequiredFields = 'title' | 'author'
type BookMdFields = Exclude<keyof Book, BookDbFields | 'note'>
type BookMdDatabaseCache = {
  __database_cache?: Pick<Book, BookDbRequiredFields> &
    Partial<NonNullableProperties<Pick<Book, BookDbOptionalFields>>>
}
type BookMdInput = {
  __input?: { cover?: string }
}

export type BookMd = {
  filename: string
  markdown?: string
  frontmatter: Pick<Book, BookMdRequiredFields> &
    Partial<NonNullableProperties<Omit<Book, BookMdRequiredFields | 'note' | BookDbFields>>> &
    BookMdDatabaseCache &
    BookMdInput
}

const bookMdSpecialFields: Array<keyof BookMdDatabaseCache | keyof BookMdInput> = [
  '__database_cache',
  '__input',
]

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

function bookOnDiskToBookCreateInput(bookOnDisk: BookMd): Prisma.BookCreateInput {
  const bookMdFields = omit(bookOnDisk.frontmatter, bookMdSpecialFields)
  const bookCreateInput = {
    ...bookMdFields,
    slug: path.basename(bookOnDisk.filename, '.md'),
    note: bookOnDisk.markdown || '',
  }

  return bookCreateInput
}

function bookOnDiskToBookUpdateInput(bookOnDisk: BookMd, book: Book): Prisma.BookUpdateInput {
  const bookMdFields = omit(bookOnDisk.frontmatter, bookMdSpecialFields)
  const bookUpdateInput = {
    ...bookMdFields,
    slug: path.basename(bookOnDisk.filename, '.md'),
    note: bookOnDisk.markdown || '',
  }

  const bookKeys = Object.keys(bookUpdateInput) as Array<keyof typeof bookUpdateInput>

  // restrict updates to only fields that have changed between the md and db data
  bookKeys.forEach((field) => {
    if (bookUpdateInput[field] === book[field]) {
      delete bookUpdateInput[field]
    }
  })

  return bookUpdateInput
}

async function findCoverUpload(bookOnDisk: BookMd, outputDir: string): Promise<void> {
  const upload = bookOnDisk.frontmatter.__input?.cover

  if (upload) {
    const slug = path.basename(bookOnDisk.filename, '.md')
    const outputPath = path.join(outputDir, bookCoverDir, `${slug}.jpg`)

    if (/https?:\/\//i.test(upload)) {
      const tempFile = await downloadTo(upload)

      if (extname(tempFile) === '.jpg') {
        await promises.copyFile(tempFile, outputPath)
        await promises.unlink(tempFile)
      } else {
        await promises.unlink(tempFile)
        throw new Error("upload wasn't a jpg")
      }
    } else if (upload.startsWith('/') || upload.startsWith('../')) {
      const uploadPath = path.resolve(outputDir, upload)
      if (existsSync(uploadPath)) {
        const fileType = await fromFile(upload)

        if (fileType?.ext === 'jpg') {
          await promises.copyFile(upload, outputPath)
        } else {
          throw new Error("upload wasn't a jpg")
        }
      } else {
        throw new Error("upload doesn't exist")
      }
    }
  }
}

export {
  findCoverUpload,
  bookToString,
  makeBookMd,
  readBookDir,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  bookOnDiskToBookUpdateInput,
  bookOnDiskToBookCreateInput,
  findNonExistantBooks,
}
