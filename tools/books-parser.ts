import { parseFile, Row } from '@fast-csv/parse'
import { CsvFormatterStream, format } from '@fast-csv/format'
import axios from 'axios'
import { createWriteStream } from 'fs'
import { google } from 'googleapis'
import { config } from 'dotenv'

config()

interface BookSearchDoc {
  isbn: Array<string>
  title: string
  author_name: Array<string>
}

interface BookSearch {
  start: number
  num_found: number
  docs: Array<BookSearchDoc>
}

interface BookCSV {
  title: string
  author: string
  readDate: string
  isbn: string
}

interface BookParseStatus {
  scanning: boolean
  read: number
  written: number
}

async function findWithOpenLibrary(book: BookCSV): Promise<BookCSV> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

  const response = await axios.get<BookSearch>('http://openlibrary.org/search.json', {
    params: {
      title: book.title,
      author: book.author,
    },
  })

  if (response.status === 200 && response.data.num_found > 0) {
    const bookSearchDocs = response.data.docs[0]
    isbn = bookSearchDocs.isbn.reduce((accumulator, currentValue) => {
      return accumulator.length > currentValue.length ? accumulator : currentValue
    })
    title = bookSearchDocs.title
    author = bookSearchDocs.author_name.join(',')
  } else {
    console.log(`no results found for ${book.title}`)
  }

  return { title, author, readDate: book.readDate, isbn }
}

async function findWithGoogle(book: BookCSV): Promise<BookCSV> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

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
    console.log(`no results found for ${book.title}`)
  }
  return { title, author, readDate: book.readDate, isbn }
}

async function searchBook(
  book: BookCSV,
  stream: CsvFormatterStream<Row, Row>,
  status: BookParseStatus
): Promise<void> {
  let isbn = book.isbn || ''
  let title = book.title || ''
  let author = book.author || ''

  if (!isbn) {
    const bookUpdated = useGoogleSearch
      ? await findWithGoogle(book)
      : await findWithOpenLibrary(book)
    title = bookUpdated.title
    author = bookUpdated.author
    isbn = bookUpdated.isbn
  }

  stream.write({ title, author, readDate: book.readDate, isbn })
  status.written += 1

  if (!status.scanning && status.read === status.written) {
    stream.end()
  }
}

async function onFinish(rowCount: number): Promise<void> {
  searchStatus.scanning = false
  searchStatus.read = rowCount
  console.log(`done scanning ${rowCount} rows`)
}

const bookCSV = './data/books.csv'
const bookCSVIsbn = './data/books-searched.csv'
const writeStream = format()
const readStream = parseFile(bookCSV, { headers: true, maxRows: 10 })
const searchStatus: BookParseStatus = {
  scanning: true,
  written: 0,
  read: 0,
}
const googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY
const googleBooks = google.books({ version: 'v1', auth: googleBooksApiKey })
const useGoogleSearch = true

writeStream.pipe(createWriteStream(bookCSVIsbn))

readStream
  .on('error', (error) => console.error(error))
  .on('data', (data) => searchBook(data, writeStream, searchStatus))
  .on('end', onFinish)
