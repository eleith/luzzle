import { OpenLibraryWorkBook } from './open-library'

const workId = 'work-id-1'
const bookId = 'book-id-2'
const title = 'an open book title'
const key = 'book-key-3'
const number_of_pages = '423'
const type = 'mystery'
const first_publish_year = 2016
const cover_i = 123124123847
const subtitle = 'open book subtitle'
const isbn = ['isbn-12']

function makeOpenLibrarySearchWork(
  overrides: Partial<OpenLibraryWorkBook> = {}
): OpenLibraryWorkBook {
  return {
    workId,
    bookId,
    title: '',
    key,
    publish_year: [],
    number_of_pages: '',
    author_name: [],
    subject: [],
    cover_i,
    first_publish_year,
    type: '',
    place: [],
    ...overrides,
  }
}

function makeOpenLibrarySearchWorkSimple(): OpenLibraryWorkBook {
  return makeOpenLibrarySearchWork({
    workId,
    bookId,
    title,
    key,
    publish_year: ['2010'],
    number_of_pages,
    author_name: ['first author', 'second author'],
    subject: ['sci-fi'],
    subtitle,
    cover_i,
    first_publish_year,
    type,
    isbn,
    place: ['xylo'],
  })
}

export { makeOpenLibrarySearchWork, makeOpenLibrarySearchWorkSimple }
