import { mocked } from 'ts-jest/utils'
import got from 'got'
import { createWriteStream, WriteStream } from 'fs'
import { fromStream } from 'file-type'
import { PassThrough } from 'stream'
import Request from 'got/dist/source/core'
import { downloadTo } from './web'

jest.mock('got')
jest.mock('fs')
jest.mock('file-type')
jest.mock('tempy', () => {
  return { file: mocks.tempyFile }
})

const mocks = {
  gotStream: mocked(got.stream),
  createWriteStream: mocked(createWriteStream),
  fromStream: mocked(fromStream),
  tempyFile: jest.fn(),
}

// const spies = {}

describe('book', () => {
  afterEach(() => {
    const mockKeys = Object.keys(mocks) as (keyof typeof mocks)[]
    // const spyKeys = Object.keys(spies) as (keyof typeof spies)[]

    mockKeys.forEach((key) => {
      mocks[key].mockReset()
    })

    // spyKeys.forEach((key) => {
    //   spies[key].mockClear()
    // })
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
