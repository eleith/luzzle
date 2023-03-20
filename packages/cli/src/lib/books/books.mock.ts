import { vi } from 'vitest'
import { cacheDatabaseSchema } from './book.schemas'
import Books from './books'
import CacheFrom from '../cache'

vi.mock('./books')
vi.mock('./cache')

const directory = 'some_books'

function makeBooks(dir = directory): Books {
  class MockBooks extends Books {
    constructor(dir: string) {
      super(dir)
      this.cache = new CacheFrom(cacheDatabaseSchema, dir)
    }
  }

  return new MockBooks(dir)
}

export { makeBooks }
