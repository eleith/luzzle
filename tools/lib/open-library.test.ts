import { mocked } from 'ts-jest/utils'
import log from './log'
import got from 'got'
import * as openLibrary from './open-library'
import * as openLibraryFixtures from './open-library.fixtures'

jest.mock('got')
jest.mock('./log')

const mocks = {
  logError: mocked(log.error),
  logWarn: mocked(log.warn),
  gotGet: mocked(got.get),
}

describe('book', () => {
  afterEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  test('search', async () => {
    const title = 'a title'
    const author = 'a author'
    const work = openLibraryFixtures.makeOpenLibrarySearchWork()

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 200, body: { num_found: 1, docs: [work] } })

    const works = await openLibrary.search(title, author)

    expect(mocks.gotGet).toHaveBeenCalledWith(expect.any(String), {
      searchParams: { title, author },
    })
    expect(works).toEqual([work])
  })

  test('search catches error', async () => {
    const title = 'a title'
    const author = 'a author'

    mocks.gotGet.mockRejectedValueOnce(new Error('boom'))

    const works = await openLibrary.search(title, author)

    expect(works).toEqual([])
    expect(mocks.logError).toHaveBeenCalled()
  })

  test('search returns 500', async () => {
    const title = 'a title'
    const author = 'a author'

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 500 })

    const works = await openLibrary.search(title, author)

    expect(works).toEqual([])
    expect(mocks.logWarn).toHaveBeenCalled()
  })

  test('findWork', async () => {
    const workId = 'work-id'
    const work = openLibraryFixtures.makeOpenLibrarySearchWork()

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 200, body: { num_found: 1, docs: [work] } })

    const getWork = await openLibrary.findWork(workId)

    expect(mocks.gotGet).toHaveBeenCalledWith(expect.any(String), {
      searchParams: { q: workId },
    })
    expect(getWork).toEqual(work)
  })

  test('findWork catches error', async () => {
    const workId = 'work-id'

    mocks.gotGet.mockRejectedValueOnce(new Error('boom'))

    const getWork = await openLibrary.findWork(workId)

    expect(getWork).toBeNull()
    expect(mocks.logError).toHaveBeenCalled()
  })

  test('findWork returns 500', async () => {
    const workId = 'work-id'

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 500 })

    const getWork = await openLibrary.findWork(workId)

    expect(getWork).toBeNull()
    expect(mocks.logWarn).toHaveBeenCalled()
  })

  test('getWork', async () => {
    const body = 'body'
    const workId = 'work-id'

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 200, body })

    const getWork = await openLibrary.getWork(workId)

    expect(mocks.gotGet).toHaveBeenCalledWith(expect.stringContaining(workId))
    expect(getWork).toEqual(body)
  })

  test('getWork catches error', async () => {
    const workId = 'work-id'

    mocks.gotGet.mockRejectedValueOnce(new Error('boom'))

    const getWork = await openLibrary.getWork(workId)

    expect(getWork).toBeNull()
    expect(mocks.logError).toHaveBeenCalled()
  })

  test('getWork returns 500', async () => {
    const workId = 'work-id'

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 500 })

    const getWork = await openLibrary.getWork(workId)

    expect(getWork).toBeNull()
    expect(mocks.logWarn).toHaveBeenCalled()
  })

  test('getBook', async () => {
    const body = 'body'
    const bookId = 'work-id'

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 200, body })

    const getBook = await openLibrary.getBook(bookId)

    expect(mocks.gotGet).toHaveBeenCalledWith(expect.stringContaining(bookId))
    expect(getBook).toEqual(body)
  })

  test('getBook catches error', async () => {
    const bookId = 'work-id'

    mocks.gotGet.mockRejectedValueOnce(new Error('boom'))

    const getBook = await openLibrary.getBook(bookId)

    expect(getBook).toBeNull()
    expect(mocks.logError).toHaveBeenCalled()
  })

  test('getBook returns 500', async () => {
    const bookId = 'work-id'

    mocks.gotGet.mockResolvedValueOnce({ statusCode: 500 })

    const getBook = await openLibrary.getBook(bookId)

    expect(getBook).toBeNull()
    expect(mocks.logWarn).toHaveBeenCalled()
  })

  test('getCoverUrl', () => {
    const id = 12485482342
    const coverUrl = openLibrary.getCoverUrl(id)

    expect(coverUrl).toContain(id.toString())
    expect(coverUrl).toContain('L')
  })

  test('getCoverUrl with size', () => {
    const id = 12485482342
    const size = 'M'
    const coverUrl = openLibrary.getCoverUrl(id, size)

    expect(coverUrl).toContain(id.toString())
    expect(coverUrl).toContain(size)
  })
})
