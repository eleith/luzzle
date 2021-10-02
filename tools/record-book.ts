import yargs from 'yargs'
import { getCoverUrl, getWorkFromBook, OpenLibraryFullWork } from './openlibrary'
import { findVolume } from './google-books'
import { PrismaClient, Book, Prisma } from '@app/prisma'
import { downloadImage } from './downloader'
import { books_v1 } from 'googleapis'
import cuid from 'cuid'
import uniq from 'lodash/uniq'
import { forEachCsvRow } from './csv'
import { existsSync, unlinkSync } from 'fs'
import slugify from 'limax'

interface BookRow {
  readDate: string
  bookId: string
}

interface Command {
  bookId: string | undefined
  file: string | undefined
  readDate: Date
}

function searchToBook(
  openLibraryWork: OpenLibraryFullWork,
  googleSearch: books_v1.Schema$Volume | null
): Prisma.BookUncheckedCreateInput {
  const googleBook = googleSearch?.volumeInfo
  const title = googleBook?.title || openLibraryWork.title || ''
  const subtitle = googleBook?.subtitle || openLibraryWork.subtitle
  const authors = googleBook?.authors || openLibraryWork.author_name || []
  const author = authors[0]
  const coauthors = authors.slice(1).join(',')
  const publishedYear = openLibraryWork.first_publish_year
  const categories = googleBook?.categories || []
  const subjects = openLibraryWork.subject || []
  const keywords = uniq([...subjects, ...categories]).map((x) => x.toLowerCase())
  const pages = googleBook?.pageCount || Number(openLibraryWork.number_of_pages)
  const description = googleBook?.description
  const isbn = openLibraryWork.isbn?.[0]?.replace(/-|\s+/g, '')
  const slug = slugify(title)

  return {
    title,
    author,
    slug,
    ...(subtitle && { subtitle }),
    ...(isbn && { isbn }),
    ...(coauthors && { coauthors }),
    ...(pages && !isNaN(pages) && { pages }),
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
  })
  .parseSync()

async function makeBookInput(
  work: OpenLibraryFullWork,
  readDate?: Date
): Promise<Prisma.BookCreateInput> {
  const googleVolume = await findVolume(work.title, work.author_name[0])
  const book = searchToBook(work, googleVolume)

  book.id_ol_book = work.bookId
  book.id_ol_work = work.workId

  if (readDate) {
    book.year_read = readDate.getUTCFullYear()
    book.month_read = readDate.getUTCMonth()
  }

  return book
}

async function lookupAndRecord(
  prisma: PrismaClient,
  bookId: string,
  readDate?: Date
): Promise<Book | null> {
  console.log(`looking up [${bookId}]`)
  const work = await getWorkFromBook(bookId)

  if (work) {
    const book = await makeBookInput(work, readDate)

    if (work.cover_i) {
      const existingBook = await prisma.book.findUnique({ where: { id_ol_book: bookId } })

      if (existingBook?.id_cover_image) {
        unlinkSync(getCoverPath(existingBook.id_cover_image))
      }

      const coverId = cuid()
      const coverUrl = getCoverUrl(work.cover_i)
      await downloadImage(coverUrl, getCoverPath(coverId))
      book.id_cover_image = coverId
    }

    console.log(`[${book.title}] found and will be added to db`)
    return await prisma.book.create({ data: book })
  } else {
    console.error(`[bookId: ${bookId}] not found`)
    return null
  }
}

async function insertBooksFromCsvFile(prisma: PrismaClient, file: string): Promise<number> {
  return forEachCsvRow<BookRow>(file, async (row: BookRow) => {
    const { bookId, readDate } = row
    if (bookId) {
      await lookupAndRecord(prisma, bookId, readDate ? new Date(readDate) : undefined)
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
