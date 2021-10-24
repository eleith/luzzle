import { OpenLibraryWorkBook } from './open-library'

const workId = 'work-id-1'
const bookId = 'book-id-2'
const title = 'a book title'
const key = 'book-key-3'
const publish_year: string[] = []
const number_of_pages = '423'
const type = 'mystery'
const first_publish_year = 2016
const author_name: string[] = []
const subject: string[] = []
const place: string[] = []
const cover_i = 123124123847

function makeOpenLibrarySearchWork(
  overrides: Partial<OpenLibraryWorkBook> = {}
): OpenLibraryWorkBook {
  return {
    workId,
    bookId,
    title,
    key,
    publish_year,
    number_of_pages,
    author_name,
    subject,
    cover_i,
    first_publish_year,
    type,
    place,
    ...overrides,
  }
}

export { makeOpenLibrarySearchWork }
