import { OpenLibrarySearchWork, OpenLibraryBook } from './open-library'

const title = 'an open book title'
const key = 'book-key-3'
const first_publish_year = 2016
const cover_i = 123124123847
const subtitle = 'open book subtitle'
const description = 'open book description'

function makeOpenLibrarySearchWork(
  overrides: Partial<OpenLibrarySearchWork> = {}
): OpenLibrarySearchWork {
  return {
    title: '',
    key,
    publish_year: [],
    number_of_pages: '',
    author_name: [],
    subject: [],
    cover_i,
    first_publish_year,
    type: 'work',
    ...overrides,
  }
}

function makeOpenLibraryBook(overrides: Partial<OpenLibraryBook> = {}): OpenLibraryBook {
  return {
    title,
    subtitle,
    description,
    authors: [],
    number_of_pages: 423,
    publish_date: '',
    covers: [],
    ...overrides,
  }
}

export { makeOpenLibrarySearchWork, makeOpenLibraryBook }
