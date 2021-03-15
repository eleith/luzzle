import { format } from '@fast-csv/format'
import { createWriteStream } from 'fs'
import { google } from 'googleapis'
import { config } from 'dotenv'
import { findIsbn as findIsbnWithOpenLibrary } from './openlibrary'
import { forEachRowIn, BookRow } from './books-csv'

config()

const writeStream = format({ headers: true })

async function findWithOpenLibrary(book: BookRow): Promise<BookRow> {
  const title = book.title || ''
  const author = book.author || ''
  const isbn = await findIsbnWithOpenLibrary(title, author)

  return { title, author, readDate: book.readDate, isbn: isbn || '' }
}

async function findWithGoogle(book: BookRow): Promise<BookRow> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

  console.log(`searching google for '${book.title}'`)
  const response = await googleBooks.volumes.list({ q: `${book.title} ${book.author}` })

  if (response.status === 200 && response.data.items?.length) {
    const bookSearch = response.data.items[0]
    const identifier = bookSearch.volumeInfo?.industryIdentifiers?.find(
      (identifier) => identifier.type === 'ISBN_13'
    )
    isbn = identifier?.identifier || ''
    title = bookSearch.volumeInfo?.title || ''
    author = bookSearch.volumeInfo?.authors?.join(',') || ''
  } else {
    console.log(`no results found for '${book.title}'`)
  }
  return { title, author, readDate: book.readDate, isbn }
}

async function searchBook(book: BookRow): Promise<void> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

  if (!isbn) {
    const search = useGoogleSearch ? findWithGoogle : findWithOpenLibrary
    const bookUpdated = await search(book)
    title = bookUpdated.title
    isbn = bookUpdated.isbn
    author = bookUpdated.author
  }

  writeStream.write({ title, author, readDate: book.readDate, isbn })
}

function readFinished(): void {
  writeStream.end()
}

const bookListFile = './data/books.csv'
const bookUpdatedListFile = './data/books.search.csv'
const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY
const googleBooks = google.books({ version: 'v1', auth: googleBooksApiKey })
const useGoogleSearch = false

writeStream.pipe(createWriteStream(bookUpdatedListFile))

async function main(): Promise<void> {
  await forEachRowIn(bookListFile, searchBook, { onEnd: readFinished })
}

main().catch((e) => console.error(e))
