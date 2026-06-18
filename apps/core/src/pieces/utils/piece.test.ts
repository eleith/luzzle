import { createReadStream, existsSync, ReadStream, Stats, WriteStream } from 'fs'
import { copyFile, stat } from 'fs/promises' // Direct import matching source
import { describe, expect, test, vi, afterEach, beforeAll, MockInstance } from 'vitest'
import { createHash } from 'crypto'
import { PassThrough, Readable } from 'stream'
import got, { Request } from 'got'
import path from 'path'
import { ASSETS_DIRECTORY } from '../assets.js'
import {
	calculateHashFromFile,
	isAttachableStream,
	savePieceFieldAsset,
	makePieceValue,
	detectStreamFileType,
	savePieceAsset,
	AttachableStream,
} from './piece.js'
import { PieceFrontmatterSchemaField } from './frontmatter.js'
import { makeStorage } from '../../storage/storage.mock.js'
import { makeMarkdownSample } from '../Piece.fixtures.js'

vi.mock('fs/promises')
vi.mock('crypto')
vi.mock('fs')
vi.mock('got')

const mocks = {
	copyFile: vi.mocked(copyFile),
	stat: vi.mocked(stat),
	existsSync: vi.mocked(existsSync),
	createReadStream: vi.mocked(createReadStream),
	createHash: vi.mocked(createHash),
	gotStream: vi.mocked(got.stream),
}

const spies: { [key: string]: MockInstance } = {}

let fullPngBuffer: Buffer

describe('pieces/utils/piece.ts', () => {
	beforeAll(async () => {
		const { readFile } = await vi.importActual<typeof import('fs/promises')>('fs/promises')
		const assetPath = path.resolve('test/assets/favicon.png')
		fullPngBuffer = await readFile(assetPath)
	})

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

	test('detectStreamFileType should correctly identify PNG from full buffer', async () => {
		const stream = Readable.from([fullPngBuffer])

		const result = await detectStreamFileType(stream)

		expect(result.type).toEqual({ ext: 'png', mime: 'image/png' })

		const resultChunks = []
		for await (const chunk of result.stream) {
			resultChunks.push(chunk)
		}
		const finalBuffer = Buffer.concat(resultChunks)

		expect(finalBuffer.toString('hex')).toEqual(fullPngBuffer.toString('hex'))
	})

	test('detectStreamFileType with string chunks (non-Buffer)', async () => {
		const stream = Readable.from(['hello ', 'world'])

		const result = await detectStreamFileType(stream)

		expect(result.type).toBeUndefined()

		const resultChunks = []
		for await (const chunk of result.stream) {
			resultChunks.push(chunk)
		}
		const finalString = Buffer.concat(resultChunks).toString()

		expect(finalString).toEqual('hello world')
	})

	test('detectStreamFileType with custom maxBytes and multiple chunks', async () => {
		const chunk1 = Buffer.from('hello ')
		const chunk2 = Buffer.from('world')
		const chunk3 = Buffer.from('!')
		const stream = Readable.from([chunk1, chunk2, chunk3])

		const result = await detectStreamFileType(stream, 5)

		const resultChunks = []
		for await (const chunk of result.stream) {
			resultChunks.push(chunk)
		}
		const finalString = Buffer.concat(resultChunks).toString()

		expect(finalString).toEqual('hello world!')
	})

	test('isAttachableStream returns true for valid stream wrapper', () => {
		const stream = new PassThrough()
		expect(isAttachableStream({ stream })).toBe(true)
		expect(isAttachableStream({ stream, filename: 'file.jpg' })).toBe(true)
	})

	test('isAttachableStream returns false for non-objects', () => {
		expect(isAttachableStream('string')).toBe(false)
		expect(isAttachableStream(42)).toBe(false)
		expect(isAttachableStream(null)).toBe(false)
		expect(isAttachableStream(undefined)).toBe(false)
	})

	test('isAttachableStream returns false for objects without stream', () => {
		expect(isAttachableStream({})).toBe(false)
		expect(isAttachableStream({ filename: 'file.jpg' })).toBe(false)
	})

	test('isAttachableStream returns false when stream has no pipe method', () => {
		expect(isAttachableStream({ stream: {} })).toBe(false)
		expect(isAttachableStream({ stream: null })).toBe(false)
	})

	test('makePieceValue', async () => {
		const field = { name: 'title', type: 'string' } as PieceFrontmatterSchemaField
		const value = 'new title'

		const pieceValue = await makePieceValue(field, value)

		expect(pieceValue).toEqual(value)
	})

	test('makePieceValue array', async () => {
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

	test('makePieceValue preserves objects', async () => {
		const field = { name: 'meta', type: 'object' } as PieceFrontmatterSchemaField

		const value = { author: 'Bob' }

		expect(await makePieceValue(field, value)).toBe(value)
	})

	test('makePieceValue path asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = '/path/to/asset'
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats) // Properly mock resolved value

		const pieceValuePromise = makePieceValue(field, asset)

		process.nextTick(() => {
			readable.emit('open')
		})

		const pieceValue = await pieceValuePromise as AttachableStream

		expect(pieceValue.stream).toEqual(readable)
	})

	test('makePieceValue url asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://path/to/asset'
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		const pieceValuePromise = makePieceValue(field, asset)

		readable.emit('response', { statusCode: 200 })

		const pieceValue = await pieceValuePromise as AttachableStream

		expect(pieceValue.stream).toEqual(readable)
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

		// Emit error synchronously or ensure the promise chain catches it
		setTimeout(() => {
			readable.emit('error', new Error('test file error'))
		}, 0)

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
		const pieceValue = await makePieceValue(field, { stream: readable }) as AttachableStream

		expect(mocks.stat).not.toHaveBeenCalled()
		expect(pieceValue.stream).toEqual(readable)
	})

	test('makePieceValue with invalid value', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const making = makePieceValue(field, 55)

		await expect(making).rejects.toThrowError()
	})

	test('savePieceFieldAsset should create an asset from a stream (PNG via magic bytes)', async () => {
		const field = { name: 'cover', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', { cover: 'cover.jpg' })
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		const mockStream = { stream: Readable.from([fullPngBuffer]), filename: 'photo.jpg' }

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const asset = await savePieceFieldAsset(markdown.filePath, field, mockStream, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'photo.png'))
	})

	test('savePieceFieldAsset should work with field arrays (PNG)', async () => {
		const field = {
			name: 'cover',
			type: 'array',
			items: { format: 'asset' },
		} as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', { cover: 'cover.jpg' })
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		const mockStream = { stream: Readable.from([fullPngBuffer]), filename: 'photo.jpg' }

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const asset = await savePieceFieldAsset(markdown.filePath, field, mockStream, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'photo.png'))
	})

	test('savePieceFieldAsset should use filename for name and ext (text file fallback)', async () => {
		const field = { name: 'script', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', { script: 'deploy.bash' })
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		const mockStream = {
			stream: Readable.from([Buffer.from('#!/bin/bash\necho hi')]),
			filename: 'deploy.bash',
		}

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const asset = await savePieceFieldAsset(markdown.filePath, field, mockStream, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'deploy.bash'))
	})

	test('savePieceFieldAsset should fall back to field name with no ext for bare Readable', async () => {
		const field = { name: 'cover', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath.md', 'books', '', { cover: 'cover.bin' })
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		// Generic Readable: no path info, no magic bytes detectable
		const mockGenericReadable = {
			stream: Readable.from([Buffer.from('some binary data')]) as unknown as Readable,
		}

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const asset = await savePieceFieldAsset(markdown.filePath, field, mockGenericReadable, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		// Falls back to field name, no extension (not .md)
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'cover'))
	})

	test('savePieceFieldAsset should increment counter on filename collision', async () => {
		const field = { name: 'cover', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', { cover: 'cover.jpg' })
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		const mockStream = {stream: Readable.from([fullPngBuffer]), filename: 'photo.jpg'}

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		// First call: attachDir doesn't exist, target file doesn't exist
		spies.exists = vi
			.spyOn(storage, 'exists')
			.mockResolvedValueOnce(false) // attachDir check
			.mockResolvedValueOnce(true) // photo.png exists → collision
			.mockResolvedValueOnce(false) // photo-2.png free

		const asset = await savePieceFieldAsset(markdown.filePath, field, mockStream, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'photo-2.png'))
	})

	test('savePieceFieldAsset throws for non-asset field', async () => {
		const field = { name: 'title', type: 'string' } as PieceFrontmatterSchemaField
		const stream = { stream: new PassThrough() as unknown as Request }
		const storage = makeStorage('root')
		const asset = savePieceFieldAsset('file', field, stream, storage)

		await expect(asset).rejects.toThrowError()
	})

	test('savePieceAsset should write an asset directly to storage', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', { cover: 'cover.jpg' })
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		const stream = Readable.from([fullPngBuffer])

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const asset = await savePieceAsset(markdown.filePath, 'photo.jpg', stream, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'photo.png'))
	})

	test('savePieceAsset should default to "attachment" and empty extension if filename is empty and format is unknown', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', {})
		const mocksWriteStream = new PassThrough() as unknown as WriteStream

		const stream = Readable.from([Buffer.from('plain binary text data')])

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const asset = await savePieceAsset(markdown.filePath, '', stream, storage)
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'attachment'))
	})

	test('savePieceAsset should accept a URL source, download it, and write it to storage', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', {})
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const assetPromise = savePieceAsset(markdown.filePath, 'https://example.com/some-file.png', storage)

		readable.emit('response', { statusCode: 200 })
		readable.write(fullPngBuffer)
		readable.end()

		const asset = await assetPromise
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'some-file.png'))
	})

	test('savePieceAsset should fallback to "attachment" when URL has no filename and format is unknown', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', {})
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const assetPromise = savePieceAsset(markdown.filePath, 'https://example.com/', storage)

		readable.emit('response', { statusCode: 200 })
		readable.write(Buffer.from('plain text content'))
		readable.end()

		const asset = await assetPromise
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'attachment'))
	})

	test('savePieceAsset should accept a URL source and options.name, using custom name but keeping extension if options.name lacks one', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', {})
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const assetPromise = savePieceAsset(
			markdown.filePath,
			'https://example.com/some-file.png',
			storage,
			{ name: 'custom-logo' }
		)

		readable.emit('response', { statusCode: 200 })
		readable.write(fullPngBuffer)
		readable.end()

		const asset = await assetPromise
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'custom-logo.png'))
	})

	test('savePieceAsset should accept a URL source and options.name, using custom name with its own extension if options.name has one', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', {})
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const assetPromise = savePieceAsset(
			markdown.filePath,
			'https://example.com/some-file.png',
			storage,
			{ name: 'custom-logo.jpg' }
		)

		readable.emit('response', { statusCode: 200 })
		readable.write(Buffer.from('plain binary text data'))
		readable.end()

		const asset = await assetPromise
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'custom-logo.jpg'))
	})

	test('savePieceAsset should accept a local file source, read it, and write it to storage', async () => {
		const storage = makeStorage('root')
		const markdown = makeMarkdownSample('samplePath', 'books', '', {})
		const mocksWriteStream = new PassThrough() as unknown as WriteStream
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockReturnValue(mocksWriteStream)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValue(false)
		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)

		const assetPromise = savePieceAsset(markdown.filePath, '/local/path/image.png', storage)

		process.nextTick(() => {
			readable.emit('open')
			readable.write(fullPngBuffer)
			readable.end()
		})

		const asset = await assetPromise
		const pieceDir = markdown.filePath.replace(/\.[^.]+$/, '')
		expect(asset).toBe(path.join(ASSETS_DIRECTORY, pieceDir, 'image.png'))
	})
})
