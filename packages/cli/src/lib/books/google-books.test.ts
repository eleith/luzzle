import * as googleBooks from './google-books.js'
import * as googleLibraryFixtures from './google-books.fixtures.js'
import { describe, expect, test, vi, afterEach } from 'vitest'
import { books_v1, books } from '@googleapis/books'
import { GaxiosResponse } from 'gaxios'

vi.mock('../log')
vi.mock('@googleapis/books')

const fixtures = {
  volumeSimple: googleLibraryFixtures.makeVolumeSimple(),
}

const mocks = {
  volumesList: vi.fn(),
  books: vi.mocked(books),
}

describe('google-books', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  test('findVolumes', async () => {
    const title = 'a title'
    const author = 'a author'
    const key = 'key'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: { items: [fixtures.volumeSimple] },
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.books.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volumes = await googleBooks.findVolumes(key, title, author)

    expect(mocks.volumesList).toHaveBeenCalledWith({ q: `${title} ${author}` })
    expect(volumes).toEqual([fixtures.volumeSimple])
  })

  test('findVolumes returns null', async () => {
    const title = 'a title'
    const author = 'a author'
    const key = 'key'

    mocks.volumesList.mockResolvedValueOnce({
      status: 400,
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.books.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volumes = await googleBooks.findVolumes(key, title, author)
    expect(volumes).toBeNull()
  })

  test('findVolume', async () => {
    const title = 'a title'
    const author = 'a author'
    const key = 'key'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: { items: [fixtures.volumeSimple] },
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.books.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolume(key, title, author)
    expect(volume).toEqual(fixtures.volumeSimple)
  })

  test('findVolume returns null', async () => {
    const title = 'a title'
    const author = 'a author'
    const key = 'key'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: {},
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.books.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolume(key, title, author)
    expect(volume).toBeNull()
  })

  test('findVolumeByIsbn', async () => {
    const isbn = 'isbn-number'
    const key = 'key'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: { items: [fixtures.volumeSimple] },
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.books.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolumeByIsbn(key, isbn)

    expect(mocks.volumesList).toHaveBeenCalledWith({ q: `isbn:${isbn}` })
    expect(volume).toEqual(fixtures.volumeSimple)
  })

  test('findVolumeByIsbn returns null', async () => {
    const isbn = 'isbn-number'
    const key = 'key'

    mocks.volumesList.mockResolvedValueOnce({
      status: 400,
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.books.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolumeByIsbn(key, isbn)

    expect(volume).toBeNull()
  })
})
