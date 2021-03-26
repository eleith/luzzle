import yargs from 'yargs'
import {
  getBook,
  getCoverUrl,
  OpenLibraryBook,
  OpenLibrarySearchWork,
  findWork,
} from './openlibrary'
import { findVolume } from './google-books'
import { PrismaClient, Book, Prisma } from '@prisma/client'
import { downloadImage } from './downloader'
import { books_v1 } from 'googleapis'
import cuid from 'cuid'
import uniq from 'lodash/uniq'
import { forEachCsvRow, initializeCsv } from './csv'
import { existsSync } from 'fs'

interface BookRow {
  readDate: string
  bookId: string
}

interface UpdatedBookRow {
  title: string
  author: string
  readDate: string
  ol_book_id: string
  ol_work_id: string
}

interface Command {
  bookId: string | undefined
  file: string | undefined
  readDate: Date | undefined
}

function searchToBook(
  openLibraryWork: OpenLibrarySearchWork,
  openLibraryBook: OpenLibraryBook,
  googleSearch: books_v1.Schema$Volume | null
): Prisma.BookUncheckedCreateInput {
  const googleBook = googleSearch?.volumeInfo
  const title = googleBook?.title || openLibraryWork.title || ''
  const subtitle = googleBook?.subtitle || openLibraryBook.subtitle
  const authors = googleBook?.authors || openLibraryWork.author_name || []
  const author = authors[0]
  const coauthors = authors.slice(1).join(',')
  const publishedYear = openLibraryWork.first_publish_year
  const categories = googleBook?.categories || []
  const subjects = openLibraryWork.subject || []
  const keywords = uniq([...subjects, ...categories]).map((x) => x.toLowerCase())
  const pages = googleBook?.pageCount || openLibraryBook.number_of_pages
  const description = googleBook?.description
  const isbnDashes = openLibraryBook.isbn_13?.[0] || openLibraryBook.isbn_10?.[0]
  const isbn = isbnDashes?.replace(/-|\s+/g, '')

  return {
    title,
    author,
    ...(subtitle && { subtitle }),
    ...(isbn && { isbn }),
    ...(coauthors && { coauthors }),
    ...(pages && { pages }),
    ...(description && { description }),
    ...(keywords.length && { keywords: keywords.join(',') }),
    ...(publishedYear && { year_first_published: publishedYear }),
  }
}

function getCoverPath(id: string): string {
  const folder1 = id.substr(-2)
  const folder2 = id.substr(-4, 2)
  return `./data/images/${folder1}/${folder2}/${id}.jpg`
}

const argv = yargs(process.argv.slice(2))
  .options({
    file: { type: 'string', alias: 'f', description: 'csv of books to parse and add' },
    bookId: { type: 'string', alias: 'w', description: 'openlibrary book id' },
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
    if (!argv.file && !argv.bookId) {
      throw new Error('must provide a file or work id')
    }

    if (argv.file && !existsSync(argv.file)) {
      throw new Error(`${argv.f} does not exist`)
    }

    return true
  }).argv

async function lookup(bookId: string, readDate?: Date): Promise<Prisma.BookCreateInput | null> {
  const openLibraryBook = await getBook(bookId)

  if (openLibraryBook) {
    const workId = openLibraryBook.works[0].key.replace(/\/works\//, '')
    const openLibraryWork = await findWork(workId)
    if (openLibraryWork) {
      const googleVolume = await findVolume(openLibraryWork.title, openLibraryWork.author_name[0])
      const book = searchToBook(openLibraryWork, openLibraryBook, googleVolume)

      book.id_ol_book = bookId
      book.id_ol_work = workId

      if (openLibraryWork.cover_i) {
        const coverId = cuid()
        const coverUrl = getCoverUrl(openLibraryWork.cover_i)
        await downloadImage(coverUrl, getCoverPath(coverId))
        book.id_cover_image = coverId
      }

      if (readDate) {
        book.year_read = readDate.getUTCFullYear()
        book.month_read = readDate.getUTCMonth()
      }

      return book
    }
  }
  return null
}

async function lookupAndRecord(
  prisma: PrismaClient,
  bookId: string,
  readDate?: Date
): Promise<Book | null> {
  console.log(`looking up [${bookId}]`)
  const book = await lookup(bookId, readDate)
  if (book) {
    console.log(`[${book.title}] found and will be added to db`)
    return await prisma.book.create({ data: book })
  } else {
    console.error(`[bookId: ${bookId}] not found`)
    return null
  }
}

async function insertBooksFromCsvFile(prisma: PrismaClient, file: string): Promise<number> {
  const writeStream = initializeCsv<UpdatedBookRow>(`${file}.updated.csv`)
  return forEachCsvRow<BookRow>(file, async (row: BookRow) => {
    const { bookId, readDate } = row
    if (bookId) {
      const book = await lookupAndRecord(prisma, bookId, readDate ? new Date(readDate) : undefined)

      writeStream.write({
        title: book?.title,
        author: book?.author,
        readDate: readDate,
        workId: book?.id_ol_work,
        bookId: book?.id_ol_book,
      })
    } else {
      console.log(`bad row ${row}`)
    }
  })
}

async function run(command: Command): Promise<void> {
  const prisma = new PrismaClient()

  if (command.bookId) {
    await lookupAndRecord(prisma, command.bookId, command.readDate).finally(async () => {
      await prisma.$disconnect()
    })
  } else if (command.file) {
    await insertBooksFromCsvFile(prisma, command.file).finally(async () => {
      await prisma.$disconnect()
    })
  }
}

run(argv).catch(console.error)
