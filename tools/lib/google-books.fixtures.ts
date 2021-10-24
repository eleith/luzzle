import { books_v1 } from 'googleapis'

const title = 'a book title'
const description = 'a book description'
const authors = ['an author']

function makeVolumeInfo(
  overrides: Partial<books_v1.Schema$Volume['volumeInfo']> = {}
): books_v1.Schema$Volume['volumeInfo'] {
  return {
    title,
    authors,
    description,
    ...overrides,
  }
}

export { makeVolumeInfo }
