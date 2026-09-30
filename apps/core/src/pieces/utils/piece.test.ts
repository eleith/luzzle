import type { ReadStream, WriteStream } from 'fs';
import { readFile } from 'fs/promises'
import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach, beforeAll } from 'vitest'
import { createHash } from 'crypto'
import { PassThrough, Readable } from 'stream'
import type { Request } from 'got';
import got from 'got'
import path from 'path'
import { ASSETS_DIRECTORY } from '../assets.js'
import type {
	AttachableStream} from './piece.js';
import {
	calculateHashFromFile,
	isAttachableStream,
	savePieceFieldAsset,
	makePieceValue,
	detectStreamFileType,
	savePieceAsset
} from './piece.js'
import type { PieceFrontmatterSchemaField } from './frontmatter.js'
import { makeStorage } from '../../storage/storage.mock.js'
import { makeMarkdownSample } from '../Piece.fixtures.js'

vi.mock('crypto')
vi.mock('got')

const mocks = {
	createHash: vi.mocked(createHash),
	gotStream: vi.mocked(got.stream),
}

const spies: { [key: string]: MockInstance } = {}

let fullPngBuffer: Buffer

describe('pieces/utils/piece.ts', () => {
	beforeAll(async () => {
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

	test('makePieceValue accepts exact, case-insensitive boolean inputs', async () => {
		const field = { name: 'enabled', type: 'boolean' } as PieceFrontmatterSchemaField

		for (const value of [true, 1, 'true', 'True', 'T', 't', 'yes', 'YES', '1']) {
			expect(await makePieceValue(field, value)).toBe(true)
		}
		for (const value of [false, 0, 'false', 'False', 'F', 'f', 'no', 'NO', '0']) {
			expect(await makePieceValue(field, value)).toBe(false)
		}
	})

	test('makePieceValue rejects ambiguous boolean inputs', async () => {
		const field = { name: 'enabled', type: 'boolean' } as PieceFrontmatterSchemaField

		for (const value of ['not true', 'true-ish', 'maybe', '10', ' true ', 2]) {
			await expect(makePieceValue(field, value)).rejects.toThrow('enabled must be a boolean')
		}
	})

	test('makePieceValue accepts safe integers and exact integer strings', async () => {
		const field = { name: 'count', type: 'integer' } as PieceFrontmatterSchemaField

		for (const [value, expected] of [[101, 101], ['101', 101], ['-3', -3], ['+4', 4], ['007', 7]]) {
			expect(await makePieceValue(field, value)).toBe(expected)
		}
	})

	test('makePieceValue rejects invalid or unsafe integers', async () => {
		const field = { name: 'count', type: 'integer' } as PieceFrontmatterSchemaField

		for (const value of ['12 pages', '1.5', '1e3', ' 12 ', '', '9007199254740992', 1.5, Infinity, true]) {
			await expect(makePieceValue(field, value)).rejects.toThrow('count must be a safe integer')
		}
	})

	test('makePieceValue converts finite number inputs', async () => {
		const field = { name: 'rating', type: 'number' } as PieceFrontmatterSchemaField

		for (const [value, expected] of [
			[4.5, 4.5],
			['4.5', 4.5],
			['-2', -2],
			['1e3', 1000],
			['0x10', 16],
			[' 4.5 ', 4.5],
		] as Array<[number | string, number]>) {
			expect(await makePieceValue(field, value)).toBe(expected)
		}
	})

	test('makePieceValue rejects non-finite or non-numeric number inputs', async () => {
		const field = { name: 'rating', type: 'number' } as PieceFrontmatterSchemaField

		for (const value of ['', '   ', '12 pages', 'Infinity', '1e309', Infinity, NaN, true]) {
			await expect(makePieceValue(field, value)).rejects.toThrow('rating must be a finite number')
		}
	})

	test('makePieceValue preserves objects', async () => {
		const field = { name: 'meta', type: 'object' } as PieceFrontmatterSchemaField

		const value = { author: 'Bob' }

		expect(await makePieceValue(field, value)).toBe(value)
	})

	test('makePieceValue rejects local asset paths', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		for (const source of [
			'/path/to/asset',
			'path/to/asset',
			'file:///path/to/asset',
			'http:photo.jpg',
			'.assets-private/image.png',
		]) {
			await expect(makePieceValue(field, source)).rejects.toThrow(
				'Asset source must be an HTTP(S) URL'
			)
		}
		expect(mocks.gotStream).not.toHaveBeenCalled()
	})

	test('makePieceValue url asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://path/to/asset'
		const readable = new PassThrough() as unknown as Request

		mocks.gotStream.mockReturnValueOnce(readable)

		const pieceValuePromise = makePieceValue(field, asset)

		readable.emit('response', { statusCode: 200 })

		const pieceValue = await pieceValuePromise as AttachableStream

		readable.end('downloaded content')
		const chunks: Buffer[] = []
		for await (const chunk of pieceValue.stream) chunks.push(chunk)
		expect(Buffer.concat(chunks).toString()).toBe('downloaded content')
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

	test('makePieceValue logs the origin but preserves network errors for callers', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://user:password@example.com/private-token/file?signature=secret#fragment'
		const readable = new PassThrough() as unknown as Request
		mocks.gotStream.mockReturnValueOnce(readable)
		spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const pieceValuePromise = makePieceValue(field, asset)
		readable.emit('error', new Error(`Request failed for ${asset}`))

		await expect(pieceValuePromise).rejects.toThrow(`Request failed for ${asset}`)
		expect(spies.consoleError).toHaveBeenCalledWith('Error downloading file from https://example.com')
	})

	test('makePieceValue logs the origin and HTTP status on a failed response', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://user:password@example.com/private-token/file?signature=secret#fragment'
		const readable = new PassThrough() as unknown as Request
		mocks.gotStream.mockReturnValueOnce(readable)
		spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const pieceValuePromise = makePieceValue(field, asset)
		readable.emit('response', { statusCode: 403 })

		await expect(pieceValuePromise).rejects.toThrow('HTTP Error: 403')
		expect(spies.consoleError).toHaveBeenCalledWith(
			'Error downloading file from https://example.com: http 403'
		)
	})

	test('makePieceValue rejects malformed URLs without reading a local file', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		await expect(makePieceValue(field, 'https://[secret?signature=private')).rejects.toThrow(
			'Asset source must be an HTTP(S) URL'
		)
		expect(mocks.gotStream).not.toHaveBeenCalled()
	})

	test('makePieceValue existing asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = `${ASSETS_DIRECTORY}/path/to/asset`

		const pieceValue = await makePieceValue(field, asset)

		expect(pieceValue).toEqual(asset)
	})

	test('makePieceValue with stream', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const readable = new PassThrough() as unknown as ReadStream
		const pieceValue = await makePieceValue(field, { stream: readable }) as AttachableStream

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

	test('savePieceAsset preserves errors for a caller-supplied stream', async () => {
		const storage = makeStorage('root')
		vi.spyOn(storage, 'exists').mockResolvedValue(false)
		vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)
		vi.spyOn(storage, 'createWriteStream').mockImplementation(() => {
			throw new Error('disk full')
		})

		await expect(
			savePieceAsset('samplePath.md', 'file.txt', Readable.from(['content']), storage)
		).rejects.toThrow('disk full')
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

	test('savePieceAsset logs only the origin on stream errors after a response', async () => {
		const storage = makeStorage('root')
		const asset = 'https://user:password@example.com/private-token/file?signature=secret#fragment'
		const readable = new PassThrough() as unknown as Request
		mocks.gotStream.mockReturnValueOnce(readable)
		vi.spyOn(storage, 'exists').mockResolvedValue(false)
		vi.spyOn(storage, 'makeDirectory').mockResolvedValue(undefined)
		spies.consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const assetPromise = savePieceAsset('samplePath.md', asset, storage)
		readable.emit('response', { statusCode: 200 })
		setTimeout(() => readable.emit('error', new Error(`Stream failed for ${asset}`)), 0)

		await expect(assetPromise).rejects.toThrow(`Stream failed for ${asset}`)
		expect(spies.consoleError).toHaveBeenCalledWith('Error downloading file from https://example.com')
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

	test('savePieceAsset rejects local source path strings', async () => {
		const storage = makeStorage('root')

		await expect(savePieceAsset('samplePath.md', '/local/path/image.png', storage)).rejects.toThrow(
			'Asset source must be an HTTP(S) URL'
		)
		expect(storage.createWriteStream).not.toHaveBeenCalled()
	})
})
