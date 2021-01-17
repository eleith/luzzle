import { parseFile, Row } from '@fast-csv/parse'
import { CsvFormatterStream, format } from '@fast-csv/format'
import axios from 'axios'
import { createWriteStream } from 'fs'
import { google } from 'googleapis'
import { config } from 'dotenv'
import { queue, QueueObject } from 'async'

config()

interface OpenLibraryBookDoc {
  isbn: Array<string>
  title: string
  author_name: Array<string>
}

interface OpenLibrarySearchResponse {
  start: number
  num_found: number
  docs: Array<OpenLibraryBookDoc>
}

interface BookRow {
  title: string
  author: string
  readDate: string
  isbn: string
}

interface BookSearchQueue {
  row: BookRow
  stream: CsvFormatterStream<Row<BookRow>, Row>
}

async function findWithOpenLibrary(book: BookRow): Promise<BookRow> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

  console.log(`searching open library for '${book.title}'`)
  const response = await axios.get<OpenLibrarySearchResponse>(
    'http://openlibrary.org/search.json',
    {
      params: {
        title: book.title,
        author: book.author,
      },
    }
  )

  if (response.status === 200 && response.data.num_found > 0) {
    const bookSearchDocs = response.data.docs[0]
    isbn = bookSearchDocs.isbn.reduce((accumulator, currentValue) => {
      return accumulator.length > currentValue.length ? accumulator : currentValue
    })
    title = bookSearchDocs.title
    author = bookSearchDocs.author_name.join(',')
  } else {
    console.log(`no results found for '${book.title}'`)
  }

  return { title, author, readDate: book.readDate, isbn }
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

async function searchBook(book: BookRow, stream: CsvFormatterStream<Row, Row>): Promise<void> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

  if (!isbn) {
    const search = useGoogleSearch ? findWithGoogle : findWithOpenLibrary
    const bookUpdated = await search(book)
    title = bookUpdated.title
    author = bookUpdated.author
    isbn = bookUpdated.isbn
  }

  stream.write({ title, author, readDate: book.readDate, isbn })
}

async function readFinished(
  rowCount: number,
  queue: QueueObject<BookSearchQueue>,
  stream: CsvFormatterStream<Row, Row>
): Promise<void> {
  console.log(`done scanning ${rowCount} rows`)
  queue.drain(function () {
    console.log('done searching')
    stream.end()
  })
}

function readRow(row: BookRow): void {
  searchQueue.push({ row, stream: writeStream }, () =>
    console.log(`scanned and searched for '${row.title}'`)
  )
}

const bookListFile = './data/books.csv'
const bookUpdatedListFile = './data/books-searched.csv'
const writeStream = format({ headers: true })
const readStream = parseFile<Row<BookRow>, Row>(bookListFile, { headers: true })
const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY
const googleBooks = google.books({ version: 'v1', auth: googleBooksApiKey })
const useGoogleSearch = true
const searchQueue = queue<BookSearchQueue, void>(async (task, callback) => {
  await searchBook(task.row, task.stream)
  callback()
}, 1)

writeStream.pipe(createWriteStream(bookUpdatedListFile))

readStream
  .on('error', (error) => console.error(error))
  .on('data', readRow)
  .on('end', (rowCount: number) => readFinished(rowCount, searchQueue, writeStream))
