import yargs from 'yargs'
import {
  getDetailsByIsbn as getDetailsByIsbnWithOpenLibrary,
  getDetailsByBookId,
  getDetailsByWorkId,
  OpenLibrarySearchResponse,
} from './openlibrary'
import { getDetailsByIsbn as getDetailsByIsbnWithGoogle } from './google-books'
import { PrismaClient, Book } from '@prisma/client'
import { downloadImage } from './downloader'
import { books_v1 } from 'googleapis'
import cuid from 'cuid'
import uniq from 'lodash/uniq'
import { forEachCsvRow } from './csv'
import { existsSync } from 'fs'

export interface BookRow {
  title: string
  author: string
  readDate: string
  isbn: string
}

function searchToBook(
  openLibrarySearch: OpenLibrarySearchResponse,
  googleSearch: books_v1.Schema$Volume
): Omit<Partial<Book>, 'id' | 'title' | 'author'> & Pick<Book, 'title' | 'author'> {
  const googleBook = googleSearch.volumeInfo
  const title = googleBook?.title || openLibrarySearch.title || ''
  const subtitle = googleBook?.subtitle || openLibrarySearch.subtitle || undefined
  const authors = googleBook?.authors || openLibrarySearch.authors.map((x) => x.name) || []
  const coauthors = authors.length > 1 ? authors.slice(1).join(',') : undefined
  const publishedDate = googleBook?.publishedDate || openLibrarySearch.publish_date || undefined
  const publishedYear = publishedDate ? new Date(publishedDate).getUTCFullYear() : undefined
  const categories = googleBook?.categories || []
  const subjects = openLibrarySearch.subjects?.map((x) => x.name) || []
  const places = openLibrarySearch.subject_places?.map((x) => x.name) || []
  const keywords = uniq([...subjects, ...places, ...categories]).map((x) => x.toLowerCase())
  const pages = googleBook?.pageCount || openLibrarySearch.number_of_pages || undefined
  const description = googleBook?.description || undefined
  const openlibraryId = openLibrarySearch.key.replace(/^\/?books\//, '')

  return {
    title,
    subtitle,
    author: authors[0],
    coauthors,
    pages,
    description,
    keywords: keywords.length ? keywords.join(',') : undefined,
    id_ol_book: openlibraryId,
    year_first_published: publishedYear,
  }
}

function getCoverPath(id: string): string {
  const folder1 = id.substr(-2)
  const folder2 = id.substr(-4, 2)
  return `./data/images/${folder1}/${folder2}/${id}.jpg`
}

const commands = yargs(process.argv.slice(2))
  .options({
    file: { type: 'string', alias: 'f', description: 'csv of books to parse and add' },
    isbn: { type: 'string', alias: 'i', description: 'isbn of book to record' },
    readDate: {
      type: 'string',
      alias: 'r',
      default: new Date(),
      defaultDescription: 'today',
      description: 'read date (ex: jan 2020 or 1/1/21)',
      coerce(x: string): Date {
        const time = Date.parse(x)
        if (isNaN(time)) {
          throw new Error(`[error]: ${x} is not a valid date`)
        } else {
          return new Date(time)
        }
      },
    },
  })
  .check((argv) => {
    if (!argv.file && !argv.isbn) {
      throw new Error('must provide a file or isbn')
    }

    if (argv.file && !existsSync(argv.file)) {
      throw new Error(`${argv.f} does not exist`)
    }

    return true
  }).argv

const prisma = new PrismaClient()

async function isbnLookupAndUpsert(isbn: string, readDate?: Date): Promise<Book | null> {
  const openLibrarySearchPromise = getDetailsByIsbnWithOpenLibrary(isbn)
  const googleSearchPromise = getDetailsByIsbnWithGoogle(isbn)

  const [openLibrarySearch, googleSearch] = await Promise.all([
    openLibrarySearchPromise,
    googleSearchPromise,
  ])

  if (openLibrarySearch && googleSearch) {
    const book = searchToBook(openLibrarySearch, googleSearch)
    book.isbn = isbn

    if (book.id_ol_book) {
      const openLibraryBook = await getDetailsByBookId(book.id_ol_book)
      if (openLibraryBook) {
        const workId = openLibraryBook.works[0].key.replace(/^\/?works\//, '')
        const openLibraryWork = await getDetailsByWorkId(workId)
        book.id_ol_work = workId
        book.description = openLibraryWork?.description?.value || book.description
      }
    }

    const openLibraryCover = openLibrarySearch.cover?.large
    const googleCover = googleSearch.volumeInfo?.imageLinks?.extraLarge
    const coverUrl = openLibraryCover || googleCover

    if (coverUrl) {
      const coverId = cuid()
      await downloadImage(coverUrl, getCoverPath(coverId))
      book.id_cover_image = coverId
    }

    if (readDate) {
      book.year_read = readDate.getUTCFullYear()
      book.month_read = readDate.getUTCMonth()
    }

    return await prisma.book.upsert({ where: { isbn }, update: book, create: book })
  }
  return null
}

async function lookupAndRecord(isbn: string, readDate?: Date): Promise<Book | null> {
  const book = await isbnLookupAndUpsert(isbn, readDate)
  if (book) {
    console.log(`[isbn: ${isbn}] found and updated:\n\n${JSON.stringify(book, null, 2)}\n\n`)
  } else {
    console.error(`[isbn: ${isbn}] not found!`)
    return null
  }
  return book
}

if (commands.isbn) {
  const { isbn, readDate } = commands
  lookupAndRecord(isbn, readDate).finally(async () => {
    await prisma.$disconnect()
  })
} else if (commands.file) {
  forEachCsvRow<BookRow>(
    commands.file,
    async (row: BookRow) => {
      const { isbn, readDate } = row
      await lookupAndRecord(isbn, readDate ? new Date(readDate) : undefined)
    },
    async () => {
      await prisma.$disconnect()
    }
  )
}
