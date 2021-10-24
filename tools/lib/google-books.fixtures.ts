import { books_v1 } from 'googleapis'

const title = 'a book title'
const description = 'a book description'
const authors = ['an author']

function makeVolumeInfo(
  overrides: Partial<books_v1.Schema$Volume['volumeInfo']> = {}
): books_v1.Schema$Volume['volumeInfo'] {
  return {
    ...overrides,
  }
}

function makeVolumeInfoSimple(): books_v1.Schema$Volume['volumeInfo'] {
  return makeVolumeInfo({ title, authors, description })
}

export { makeVolumeInfo, makeVolumeInfoSimple }
