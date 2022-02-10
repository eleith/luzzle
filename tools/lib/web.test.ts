import got from 'got'
import { createWriteStream, WriteStream } from 'fs'
import { fromStream } from 'file-type'
import { PassThrough } from 'stream'
import Request from 'got/dist/source/core'
import { downloadTo } from './web'
import { jest } from '@jest/globals'

jest.mock('got')
jest.mock('fs')
jest.mock('file-type')
jest.mock('tempy', () => {
  return { file: mocks.tempyFile }
})

const mocks = {
  gotStream: jest.mocked(got.stream),
  createWriteStream: jest.mocked(createWriteStream),
  fromStream: jest.mocked(fromStream),
  tempyFile: jest.fn(),
}

describe('book', () => {
  afterEach(() => {
    jest.resetAllMocks()
    jest.restoreAllMocks()
  })

  test('downloadTo', async () => {
    const mockReadable = new PassThrough()
    const mockWritable = new PassThrough()
    const url = 'https://somewhere'
    const filePath = '/file/to/somewhere.jpg'

    mocks.gotStream.mockReturnValueOnce(mockReadable as unknown as Request)
    mocks.createWriteStream.mockReturnValueOnce(mockWritable as unknown as WriteStream)
    mocks.fromStream.mockResolvedValueOnce({ ext: 'jpg', mime: 'image/jpeg' })
    mocks.tempyFile.mockReturnValueOnce(filePath)

    const tempFilePromise = downloadTo(url)

    process.nextTick(() => {
      mockReadable.end()
    })

    const tempFile = await tempFilePromise

    expect(mocks.gotStream).toHaveBeenCalledWith(url)
    expect(mocks.fromStream).toHaveBeenCalledWith(mockReadable)
    expect(mocks.createWriteStream).toHaveBeenCalledWith(filePath)
    expect(tempFile).toEqual(filePath)
  })

  test('downloadTo throws', async () => {
    const mockReadable = new PassThrough()
    const mockWritable = new PassThrough()
    const url = 'https://somewhere'
    const filePath = '/file/to/somewhere.jpg'

    mocks.gotStream.mockReturnValueOnce(mockReadable as unknown as Request)
    mocks.createWriteStream.mockReturnValueOnce(mockWritable as unknown as WriteStream)
    mocks.fromStream.mockResolvedValueOnce({ ext: 'jpg', mime: 'image/jpeg' })
    mocks.tempyFile.mockReturnValueOnce(filePath)

    const tempFilePromise = downloadTo(url)

    process.nextTick(() => {
      mockWritable.emit('error', new Error('boom'))
    })

    await expect(tempFilePromise).rejects.toThrow()
    expect(mocks.gotStream).toHaveBeenCalledWith(url)
    expect(mocks.fromStream).toHaveBeenCalledWith(mockReadable)
    expect(mocks.createWriteStream).toHaveBeenCalledWith(filePath)
  })
})
