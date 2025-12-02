import { createReadStream, existsSync, ReadStream, Stats, WriteStream } from 'fs'
import { copyFile, stat } from 'fs/promises'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { createHash, randomBytes } from 'crypto'
import { PassThrough, Readable, Writable } from 'stream'
import got, { Request } from 'got'
import path from 'path'
import { ASSETS_DIRECTORY } from '../assets.js'
import { AnyWebReadableByteStreamWithFileType, FileTypeResult, fileTypeStream } from 'file-type'
import { calculateHashFromFile, makePieceAttachment, makePieceValue } from './piece.js'
import { PieceFrontmatterSchemaField } from './frontmatter.js'
import { makeStorage } from '../../storage/storage.mock.js'
import { makeMarkdownSample } from './piece.fixtures.js'
import { ReadableStream, WritableStream } from 'stream/web'

vi.mock('fs/promises')
vi.mock('crypto')
vi.mock('fs')
vi.mock('file-type')
vi.mock('got')

const mocks = {
	copyFile: vi.mocked(copyFile),
	stat: vi.mocked(stat),
	existsSync: vi.mocked(existsSync),
	createReadStream: vi.mocked(createReadStream),
	createHash: vi.mocked(createHash),
	fileTypeStream: vi.mocked(fileTypeStream),
	randomBytes: vi.mocked(randomBytes),
	gotStream: vi.mocked(got.stream),
}

const spies: { [key: string]: MockInstance } = {}

describe('pieces/utils/piece.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
		vi.restoreAllMocks()
	})

	test('calculateHashFromFile', async () => {
		const data = 'data'

		const mockUpdate = vi.fn()
		const mockDigest = vi.fn().mockReturnValue(data)
		const mockReadStream = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(mockReadStream)
		mocks.createHash.mockReturnValueOnce({
			update: mockUpdate,
			digest: mockDigest,
		} as unknown as ReturnType<typeof createHash>)

		const hashPromise = calculateHashFromFile(mockReadStream)

		mockReadStream.emit('data', data)
		mockReadStream.emit('end')

		const hash = await hashPromise

		expect(mockUpdate).toHaveBeenCalled()
		expect(mockDigest).toHaveBeenCalledWith('hex')
		expect(hash).toEqual(data)
	})

	test('calculateHashFromFile error', async () => {
		const data = 'data'

		const mockUpdate = vi.fn()
		const mockDigest = vi.fn().mockReturnValue(data)
		const mockReadStream = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(mockReadStream)
		mocks.createHash.mockReturnValueOnce({
			update: mockUpdate,
			digest: mockDigest,
		} as unknown as ReturnType<typeof createHash>)
		spies.consoleError = vi.spyOn(console, 'error')

		const hashPromise = calculateHashFromFile(mockReadStream)

		mockReadStream.emit('error', new Error('error'))

		await expect(hashPromise).rejects.toThrowError()
		expect(spies.consoleError).toHaveBeenCalled()
	})

	test('makePieceValue', async () => {
		const field = { name: 'title', type: 'string' } as PieceFrontmatterSchemaField
		const value = 'new title'

		const pieceValue = await makePieceValue(field, value)

		expect(pieceValue).toEqual(value)
	})

	test('makePieceValue', async () => {
		const field = {
			name: 'title',
			type: 'array',
			items: { type: 'string' },
		} as PieceFrontmatterSchemaField
		const value = 'new title'

		const pieceValue = await makePieceValue(field, value)

		expect(pieceValue).toEqual(value)
	})

	test('makePieceValue boolean', async () => {
		const field = { name: 'title', type: 'boolean' } as PieceFrontmatterSchemaField

		const pieceValueT = await makePieceValue(field, 'true')
		const pieceValueF = await makePieceValue(field, 'false')

		expect(pieceValueT).toEqual(true)
		expect(pieceValueF).toEqual(false)
	})

	test('makePieceValue integer', async () => {
		const field = { name: 'title', type: 'integer' } as PieceFrontmatterSchemaField

		const pieceValue = await makePieceValue(field, '101')

		expect(pieceValue).toEqual(101)
	})

	test('makePieceValue path asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = '/path/to/asset'
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		const pieceValuePromise = makePieceValue(field, asset)

		process.nextTick(() => {
			readable.emit('open')
		})

		const pieceValue = await pieceValuePromise

		expect(pieceValue).toEqual(readable)
	})

	test('makePieceValue url asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://path/to/asset'
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		const pieceValuePromise = makePieceValue(field, asset)

		readable.emit('response', { statusCode: 200 })

		const pieceValue = await pieceValuePromise

		expect(pieceValue).toEqual(readable)
	})

	test('makePieceValue url asset bad status Code', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://path/to/asset'
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		const pieceValuePromise = makePieceValue(field, asset)

		readable.emit('response', { statusCode: 500 })

		await expect(pieceValuePromise).rejects.toThrow()
	})

	test('makePieceValue bad url asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://path/to/asset'
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		const pieceValuePromise = makePieceValue(field, asset)

		readable.emit('error', new Error('test error'))

		await expect(pieceValuePromise).rejects.toThrow('test error')
	})

	test('makePieceValue bad file asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = '/path/to/bad/file.jpg'
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
		spies.consoleError = vi.spyOn(console, 'error')

		const pieceValuePromise = makePieceValue(field, asset)

		process.nextTick(() => {
			readable.emit('error', new Error('test file error'))
		})

		await expect(pieceValuePromise).rejects.toThrow('test file error')
		expect(spies.consoleError).toHaveBeenCalled()
	})

	test('makePieceValue existing asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = `${ASSETS_DIRECTORY}/path/to/asset`
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		const pieceValue = await makePieceValue(field, asset)

		expect(pieceValue).toEqual(asset)
	})

	test('makePieceValue not-existant path', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = `path/to/asset`
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce(null as unknown as Stats)

		const waiting = makePieceValue(field, asset)

		await expect(waiting).rejects.toThrowError()
	})

	test('makePieceValue with stream', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const readable = new PassThrough() as unknown as ReadStream
		const pieceValue = await makePieceValue(field, readable)

		expect(mocks.stat).not.toHaveBeenCalled()
		expect(pieceValue).toEqual(readable)
	})

	test('makePieceValue with invalid value', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const making = makePieceValue(field, 55)

		await expect(making).rejects.toThrowError()
	})

	test('makePieceAttachment should create an asset from a stream', async () => {
		const field = {
			name: 'cover',
			type: 'string',
			format: 'asset',
		} as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = 'randomhex'
		const fieldName = 'cover'
		const fileName = 'samplePath'
		const mockRequest = new PassThrough() as unknown as Request
		const markdown = makeMarkdownSample(fileName, 'books', '', { [fieldName]: 'cover.jpg' })
		const expectedFilename = `${fileName}-${random}.jpg`
		const readable = new ReadableStream() as AnyWebReadableByteStreamWithFileType
		const writable = new WritableStream()
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const jpgFileType = 'jpg'
		const fileType = { ext: jpgFileType } as FileTypeResult

		spies.toWebReadable = vi.spyOn(Readable, 'toWeb')
		spies.toWebWritable = vi.spyOn(Writable, 'toWeb')
		spies.toWebReadable.mockReturnValue(readable)
		spies.toWebWritable.mockReturnValue(writable)
		mocks.fileTypeStream.mockResolvedValue({...readable, fileType, pipeTo: vi.fn() })
		mockRequest.requestUrl = { pathname: 'file.jpg' } as URL
		mocks.randomBytes.mockImplementation(() => ({ toString: () => random }) as Buffer)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)
		mocks.randomBytes.mockImplementation(() => ({ toString: () => random }) as Buffer)

		const asset = await makePieceAttachment(markdown.filePath, field, mockRequest, storage)
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, path.dirname(markdown.filePath), fieldName, `${expectedFilename}`))
	})

	test('makePieceAttachment should worth with field arrays', async () => {
		const field = {
			name: 'cover',
			type: 'array',
			items: {
				format: 'asset',
			}
		} as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = 'randomhex'
		const fieldName = 'cover'
		const fileName = 'samplePath'
		const mockRequest = new PassThrough() as unknown as Request
		const markdown = makeMarkdownSample(fileName, 'books', '', { [fieldName]: 'cover.jpg' })
		const expectedFilename = `${fileName}-${random}.jpg`
		const readable = new ReadableStream() as AnyWebReadableByteStreamWithFileType
		const writable = new WritableStream()
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const jpgFileType = 'jpg'
		const fileType = { ext: jpgFileType } as FileTypeResult

		spies.toWebReadable = vi.spyOn(Readable, 'toWeb')
		spies.toWebWritable = vi.spyOn(Writable, 'toWeb')
		spies.toWebReadable.mockReturnValue(readable)
		spies.toWebWritable.mockReturnValue(writable)
		mocks.fileTypeStream.mockResolvedValue({...readable, fileType, pipeTo: vi.fn() })
		mockRequest.requestUrl = { pathname: 'file.jpg' } as URL
		mocks.randomBytes.mockImplementation(() => ({ toString: () => random }) as Buffer)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)
		mocks.randomBytes.mockImplementation(() => ({ toString: () => random }) as Buffer)

		const asset = await makePieceAttachment(markdown.filePath, field, mockRequest, storage)
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, path.dirname(markdown.filePath), fieldName, `${expectedFilename}`))
	})

	test('makePieceAttachment should use path and path stream for file type', async () => {
		const field = {
			name: 'cover',
			type: 'string',
			format: 'asset',
		} as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = 'randomhex'
		const fieldName = 'cover'
		const fileName = 'samplePath'
		const mockStream = new PassThrough() as unknown as ReadStream
		const markdown = makeMarkdownSample(fileName, 'books', '', { [fieldName]: 'cover.jpg' })
		const expectedFilename = `${fileName}-${random}.jpg`
		const readable = new ReadableStream() as AnyWebReadableByteStreamWithFileType
		const writable = new WritableStream()
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		spies.toWebReadable = vi.spyOn(Readable, 'toWeb')
		spies.toWebWritable = vi.spyOn(Writable, 'toWeb')
		spies.toWebReadable.mockReturnValue(readable)
		spies.toWebWritable.mockReturnValue(writable)
		mocks.fileTypeStream.mockResolvedValue({...readable, pipeTo: vi.fn() })
		mockStream.path = 'file.jpg'
		mocks.randomBytes.mockImplementation(() => ({ toString: () => random }) as Buffer)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)
		mocks.randomBytes.mockImplementation(() => ({ toString: () => random }) as Buffer)

		const asset = await makePieceAttachment(markdown.filePath, field, mockStream, storage)
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, path.dirname(markdown.filePath), fieldName, `${expectedFilename}`))
	})

	test('makePieceAttachment throws for non-asset field', async () => {
		const field = { name: 'title', type: 'string' } as PieceFrontmatterSchemaField
		const stream = new PassThrough() as unknown as Request
		const storage = makeStorage('root')
		const asset = makePieceAttachment('file', field, stream, storage)

		await expect(asset).rejects.toThrowError()
	})
})
