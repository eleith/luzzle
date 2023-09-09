import { vi } from 'vitest'
import { cacheDatabaseSchema } from './book.schemas.js'
import Books from './books.js'
import CacheFrom from '../cache.js'

vi.mock('./books')
vi.mock('../cache')

const directory = 'some_cbooks'

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
