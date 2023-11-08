import { describe, expect, test, vi, afterEach } from 'vitest'
import got from 'got'
import { createWriteStream, WriteStream } from 'fs'
import { PassThrough } from 'stream'
import { Request } from 'got'
import { downloadToTmp } from './web.js'
import { temporaryFile } from 'tempy'

vi.mock('fs')
vi.mock('file-type')
vi.mock('tempy')

const mocks = {
	gotStream: vi.spyOn(got, 'stream'),
	createWriteStream: vi.mocked(createWriteStream),
	tempyFile: vi.mocked(temporaryFile),
}

describe('book', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
	})

	test('downloadToTmp', async () => {
		const mockReadable = new PassThrough()
		const mockWritable = new PassThrough()
		const url = 'https://somewhere'
		const filePath = '/file/to/somewhere.jpg'

		mocks.gotStream.mockReturnValueOnce(mockReadable as unknown as Request)
		mocks.createWriteStream.mockReturnValueOnce(mockWritable as unknown as WriteStream)
		mocks.tempyFile.mockReturnValueOnce(filePath)

		const tempFilePromise = downloadToTmp(url)

		process.nextTick(() => {
			mockReadable.end()
		})

		const tempFile = await tempFilePromise

		expect(mocks.gotStream).toHaveBeenCalledWith(url)
		expect(mocks.createWriteStream).toHaveBeenCalledWith(filePath)
		expect(tempFile).toEqual(filePath)
	})

	test('downloadToTmp throws', async () => {
		const mockReadable = new PassThrough()
		const mockWritable = new PassThrough()
		const url = 'https://somewhere'
		const filePath = '/file/to/somewhere.jpg'

		mocks.gotStream.mockReturnValueOnce(mockReadable as unknown as Request)
		mocks.createWriteStream.mockReturnValueOnce(mockWritable as unknown as WriteStream)
		mocks.tempyFile.mockReturnValueOnce(filePath)

		const tempFilePromise = downloadToTmp(url)

		process.nextTick(() => {
			mockWritable.emit('error', new Error('boom'))
		})

		await expect(tempFilePromise).rejects.toThrow()
		expect(mocks.gotStream).toHaveBeenCalledWith(url)
		expect(mocks.createWriteStream).toHaveBeenCalledWith(filePath)
	})
})
