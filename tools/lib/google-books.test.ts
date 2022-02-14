import * as googleBooks from './google-books'
import * as googleLibraryFixtures from './google-books.fixtures'
import { describe, expect, test, vi, afterEach } from 'vitest'
import { books_v1 } from 'googleapis'
import { GaxiosResponse } from 'gaxios'

vi.mock('./log')
vi.mock('dotenv')

const fixtures = {
  volumeSimple: googleLibraryFixtures.makeVolumeSimple(),
}

const mocks = {
  getGoogleBooks: vi.spyOn(googleBooks._private, '_getGoogleBooks'),
  volumesList: vi.fn(),
}

describe('google-books', () => {
  afterEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  test('findVolumes', async () => {
    const title = 'a title'
    const author = 'a author'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: { items: [fixtures.volumeSimple] },
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.getGoogleBooks.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volumes = await googleBooks.findVolumes(title, author)

    expect(mocks.volumesList).toHaveBeenCalledWith({ q: `${title} ${author}` })
    expect(volumes).toEqual([fixtures.volumeSimple])
  })

  test('findVolumes returns null', async () => {
    const title = 'a title'
    const author = 'a author'

    mocks.volumesList.mockResolvedValueOnce({
      status: 400,
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.getGoogleBooks.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volumes = await googleBooks.findVolumes(title, author)
    expect(volumes).toBeNull()
  })

  test('findVolume', async () => {
    const title = 'a title'
    const author = 'a author'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: { items: [fixtures.volumeSimple] },
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.getGoogleBooks.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolume(title, author)
    expect(volume).toEqual(fixtures.volumeSimple)
  })

  test('findVolume returns null', async () => {
    const title = 'a title'
    const author = 'a author'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: {},
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.getGoogleBooks.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolume(title, author)
    expect(volume).toBeNull()
  })

  test('findVolumeByIsbn', async () => {
    const isbn = 'isbn-number'

    mocks.volumesList.mockResolvedValueOnce({
      status: 200,
      data: { items: [fixtures.volumeSimple] },
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.getGoogleBooks.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolumeByIsbn(isbn)

    expect(mocks.volumesList).toHaveBeenCalledWith({ q: `isbn:${isbn}` })
    expect(volume).toEqual(fixtures.volumeSimple)
  })

  test('findVolumeByIsbn returns null', async () => {
    const isbn = 'isbn-number'

    mocks.volumesList.mockResolvedValueOnce({
      status: 400,
    } as GaxiosResponse<books_v1.Schema$Volumes>)

    mocks.getGoogleBooks.mockReturnValueOnce({
      volumes: {
        list: mocks.volumesList,
      },
    } as unknown as books_v1.Books)

    const volume = await googleBooks.findVolumeByIsbn(isbn)

    expect(volume).toBeNull()
  })
})
