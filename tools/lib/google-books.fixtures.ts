import { books_v1 } from 'googleapis'

const title = 'a book title'
const description = 'a book description'
const authors = ['an author']

function makeVolume(
  overrides: books_v1.Schema$Volume['volumeInfo'] = {}
): books_v1.Schema$Volume {
  return {
    volumeInfo: {
      ...overrides,
    },
  }
}

function makeVolumeSimple(): books_v1.Schema$Volume {
  return makeVolume({ title, authors, description })
}

export { makeVolume, makeVolumeSimple }
