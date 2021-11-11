import { mocked } from 'ts-jest/utils'
import log from './log'
import googleBooksMock, { googleBooksMockReset } from './google-books.mock'
import * as googleBooks from './google-books'
import * as googleLibraryFixtures from './google-books.fixtures'

jest.mock('./log')
jest.mock('dotenv')

const mocks = {
  logError: mocked(log.error),
}

describe('google-books', () => {
  afterEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
    googleBooksMockReset()
  })

  test('findVolumes', async () => {
    const title = 'a title'
    const author = 'a author'

    const volume = googleLibraryFixtures.makeVolumeInfoSimple()

    googleBooksMock.volumes.list.mockImplementationOnce(async () => {
      return {
        status: 200,
        data: { items: [volume] },
      }
    })

    const volumes = await googleBooks.findVolumes(title, author)

    expect(googleBooksMock.volumes.list).toHaveBeenCalledWith({ q: `${title} ${author}` })
    expect(volumes).toEqual([volume])
  })

  test('findVolumes returns null', async () => {
    const title = 'a title'
    const author = 'a author'

    googleBooksMock.volumes.list.mockImplementationOnce(async () => {
      return {
        status: 400,
      }
    })

    const volumes = await googleBooks.findVolumes(title, author)
    expect(volumes).toBeNull()
  })

  test('findVolume', async () => {
    const title = 'a title'
    const author = 'a author'

    const simpleVolume = googleLibraryFixtures.makeVolumeInfoSimple()

    googleBooksMock.volumes.list.mockImplementationOnce(async () => {
      return {
        status: 200,
        data: { items: [simpleVolume] },
      }
    })

    const volume = await googleBooks.findVolume(title, author)
    expect(simpleVolume).toEqual(volume)
  })

  test('findVolume returns null', async () => {
    const title = 'a title'
    const author = 'a author'

    googleBooksMock.volumes.list.mockImplementationOnce(async () => {
      return {
        status: 200,
        data: { items: [] },
      }
    })

    const volume = await googleBooks.findVolume(title, author)
    expect(volume).toBeNull()
  })

  test('findVolumeByIsbn', async () => {
    const isbn = 'isbn-number'

    const simpleVolume = googleLibraryFixtures.makeVolumeInfoSimple()

    googleBooksMock.volumes.list.mockImplementationOnce(async () => {
      return {
        status: 200,
        data: { items: [simpleVolume] },
      }
    })

    const volume = await googleBooks.findVolumeByIsbn(isbn)

    expect(googleBooksMock.volumes.list).toHaveBeenCalledWith({ q: `isbn:${isbn}` })
    expect(volume).toEqual(simpleVolume)
  })

  test('findVolumeByIsbn returns null', async () => {
    const isbn = 'isbn-number'

    googleBooksMock.volumes.list.mockImplementationOnce(async () => {
      return {
        status: 404,
      }
    })

    const volume = await googleBooks.findVolumeByIsbn(isbn)

    expect(volume).toBeNull()
  })
})
