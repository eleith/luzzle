import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import CacheFor from '../cache'
import { readdir } from 'fs/promises'
import Books from './books'
import { BookDatabaseCache, cacheDatabaseSchema } from './book.schemas'
import { Dirent } from 'fs'
import path from 'path'

vi.mock('fs/promises')
vi.mock('fs')
vi.mock('ajv/dist/jtd')
vi.mock('../cache')

const BOOK_DIRECTORY = 'books'

const mocks = {
  readdir: vi.mocked(readdir),
  CacheFor: vi.mocked(CacheFor),
}

const spies: SpyInstance[] = []

describe('lib/books/books', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    spies.forEach((spy) => {
      spy.mockRestore()
    })
  })

  test('constructor', () => {
    const dir = 'somewhere'

    mocks.CacheFor.mockReturnValueOnce({} as CacheFor<BookDatabaseCache>)

    new Books(dir)

    expect(mocks.CacheFor).toHaveBeenCalledWith(cacheDatabaseSchema, `${dir}/${BOOK_DIRECTORY}`)
  })

  test('getPathForBookCover', () => {
    const dir = 'somewhere'
    const slug = 'slug'

    const cover = new Books(dir).getPathForBookCover(slug)

    expect(cover).toEqual(`${dir}/${BOOK_DIRECTORY}/.assets/covers/${slug}.jpg`)
  })

  test('getPathForBookCover', () => {
    const dir = 'somewhere'
    const slug = 'slug'

    const cover = new Books(dir).getPathForBookCover(slug)

    expect(cover).toEqual(`${dir}/${BOOK_DIRECTORY}/.assets/covers/${slug}.jpg`)
  })

  test('getRelativePathForBookCover', () => {
    const dir = 'somewhere'
    const slug = 'slug'

    const cover = new Books(dir).getRelativePathForBookCover(slug)

    expect(cover).toEqual(`.assets/covers/${slug}.jpg`)
  })

  test('getPathForBook', () => {
    const dir = 'somewhere'
    const slug = 'slug'

    const path = new Books(dir).getPathForBook(slug)

    expect(path).toEqual(`${dir}/${BOOK_DIRECTORY}/${slug}.md`)
  })

  test('getPathForBook', async () => {
    const dir = 'somewhere'
    const slugs = [
      { isFile: () => true, name: 'a.md' },
      { isFile: () => false, name: 'b' },
      { isFile: () => true, name: 'c.json' },
    ] as unknown as Dirent[]

    mocks.readdir.mockResolvedValueOnce(slugs)
    const paths = await new Books(dir).getAllSlugs()

    expect(paths).toEqual([path.basename(slugs[0].name, '.md')])
    expect(mocks.readdir).toHaveBeenCalledWith(`${dir}/${BOOK_DIRECTORY}`, { withFileTypes: true })
  })
})
