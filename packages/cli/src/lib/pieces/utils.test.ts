import { createReadStream, existsSync, ReadStream, Stats, WriteStream } from 'fs'
import { copyFile, stat } from 'fs/promises'
import { temporaryFile } from 'tempy'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import yargs from 'yargs'
import { createHash, randomBytes } from 'crypto'
import { PassThrough } from 'stream'
import { makeContext } from '../commands/command/context.fixtures.js'
import * as util from './utils.js'
import Piece from './piece.js'
import { makeMarkdownSample, makePieceMock, makeStorage } from './piece.fixtures.js'
import got, { Request } from 'got'
import { PieceFrontmatterSchemaField } from '@luzzle/core'
import { ASSETS_DIRECTORY } from '../assets.js'
import { AnyWebReadableByteStreamWithFileType, fileTypeStream } from 'file-type'
import { pipeline } from 'stream/promises'

vi.mock('fs')
vi.mock('tempy')
vi.mock('fs/promises')
vi.mock('../web.js')
vi.mock('crypto')
vi.mock('file-type')
vi.mock('stream/promises')
vi.mock('got')

const mocks = {
	tempyFile: vi.mocked(temporaryFile),
	copyFile: vi.mocked(copyFile),
	stat: vi.mocked(stat),
	existsSync: vi.mocked(existsSync),
	createReadStream: vi.mocked(createReadStream),
	createHash: vi.mocked(createHash),
	fileType: vi.mocked(fileTypeStream),
	pipeline: vi.mocked(pipeline),
	randomBytes: vi.mocked(randomBytes),
	gotStream: vi.mocked(got.stream),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/pieces/utils.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('makePieceOption', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		util.makePieceOption(args)

		expect(spies.option).toHaveBeenCalledOnce()
	})

	test('makePiecePathPositional', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		util.makePiecePathPositional(args)

		expect(spies.positional).toHaveBeenCalledOnce()
	})

	test('parsePieceOptionArgv', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const piece = new MockPiece()

		spies.getTypes = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce([name])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)

		const result = await util.parsePieceOptionArgv(context, { piece: name })

		expect(result.piece).toBeInstanceOf(Piece)
	})

	test('parsePieceOptionArgv throws', async () => {
		const name = 'links'
		const context = makeContext()

		spies.getTypes = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])

		const parsing = util.parsePieceOptionArgv(context, { piece: name })

		await expect(parsing).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}.md`
		const piece = new MockPiece()
		const markdown = makeMarkdownSample()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)

		const result = await util.parsePiecePathPositionalArgv(context, { piece: path })

		expect(result.markdown).toEqual(markdown)
		expect(result.piece).toEqual(piece)
		expect(result.file).toEqual(path)
	})

	test('parsePiecePathPositionalArgv needs at least one piece', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}.md`
		const piece = new MockPiece()
		const markdown = makeMarkdownSample()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce([])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)

		const parsing = util.parsePiecePathPositionalArgv(context, { piece: path })

		await expect(parsing).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv does not exist', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}.md`
		const piece = new MockPiece()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockRejectedValueOnce(new Error('error'))

		const resulting = util.parsePiecePathPositionalArgv(context, { piece: path })

		await expect(resulting).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv invalid piece type', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}-2.md`
		const piece = new MockPiece()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockResolvedValueOnce(piece)

		const resulting = util.parsePiecePathPositionalArgv(context, { piece: path })

		await expect(resulting).rejects.toThrow()
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

		const hashPromise = util.calculateHashFromFile(mockReadStream)

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

		const hashPromise = util.calculateHashFromFile(mockReadStream)

		mockReadStream.emit('error', new Error('error'))

		await expect(hashPromise).rejects.toThrowError()
	})

	test('makePieceValue', async () => {
		const field = { name: 'title', type: 'string' } as PieceFrontmatterSchemaField
		const value = 'new title'

		const pieceValue = await util.makePieceValue(field, value)

		expect(pieceValue).toEqual(value)
	})

	test('makePieceValue', async () => {
		const field = {
			name: 'title',
			type: 'array',
			items: { type: 'string' },
		} as PieceFrontmatterSchemaField
		const value = 'new title'

		const pieceValue = await util.makePieceValue(field, value)

		expect(pieceValue).toEqual(value)
	})

	test('makePieceValue boolean', async () => {
		const field = { name: 'title', type: 'boolean' } as PieceFrontmatterSchemaField

		const pieceValueT = await util.makePieceValue(field, 'true')
		const pieceValueF = await util.makePieceValue(field, 'false')

		expect(pieceValueT).toEqual(true)
		expect(pieceValueF).toEqual(false)
	})

	test('makePieceValue integer', async () => {
		const field = { name: 'title', type: 'integer' } as PieceFrontmatterSchemaField

		const pieceValue = await util.makePieceValue(field, '101')

		expect(pieceValue).toEqual(101)
	})

	test('makePieceValue path asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'path/to/asset'
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		const pieceValue = await util.makePieceValue(field, asset)

		expect(pieceValue).toEqual(readable)
	})

	test('makePieceValue url asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = 'https://path/to/asset'
		const readable = new PassThrough() as unknown as Request

		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
		mocks.gotStream.mockReturnValueOnce(readable)

		const pieceValue = await util.makePieceValue(field, asset)

		expect(pieceValue).toEqual(readable)
	})

	test('makePieceValue existing asset', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = `${ASSETS_DIRECTORY}/path/to/asset`
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		const pieceValue = await util.makePieceValue(field, asset)

		expect(pieceValue).toEqual(asset)
	})

	test('makePieceValue not-existant path', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const asset = `path/to/asset`
		const readable = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(readable)
		mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)

		const waiting = util.makePieceValue(field, asset)

		expect(waiting).rejects.toThrowError()
	})

	test('makePieceValue with stream', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const readable = new PassThrough() as unknown as ReadStream
		const pieceValue = await util.makePieceValue(field, readable)

		expect(mocks.stat).not.toHaveBeenCalled()
		expect(pieceValue).toEqual(readable)
	})

	test('makePieceValue with invalid value', async () => {
		const field = { name: 'title', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const making = util.makePieceValue(field, 55)

		expect(making).rejects.toThrowError()
	})

	test('makePieceAttachment with request', async () => {
		const mockRequest = new PassThrough() as unknown as Request
		const mockReadable = new PassThrough() as unknown as AnyWebReadableByteStreamWithFileType
		const mockWritable = new PassThrough() as unknown as WriteStream
		const markdown = makeMarkdownSample()
		const field = { name: 'cover', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = Buffer.from('random')

		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValueOnce(undefined)
		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockResolvedValueOnce(mockWritable)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)
		mocks.fileType.mockResolvedValueOnce(mockReadable)
		mocks.pipeline.mockResolvedValueOnce(undefined)
		mocks.randomBytes.mockImplementationOnce(() => random)
		mockRequest.requestUrl = { pathname: 'file.html' } as URL

		const asset = await util.makePieceAttachment(markdown.filePath, field, mockRequest, storage)

		expect(asset).toBe(
			`${ASSETS_DIRECTORY}/cover/${markdown.filePath}-${random.toString('hex')}.html`
		)
	})

	test('makePieceAttachment with readable', async () => {
		const mockRequest = new PassThrough() as unknown as ReadStream
		const mockReadable = new PassThrough() as unknown as AnyWebReadableByteStreamWithFileType
		const mockWritable = new PassThrough() as unknown as WriteStream
		const markdown = makeMarkdownSample()
		const field = { name: 'cover', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = Buffer.from('random')

		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValueOnce(undefined)
		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockResolvedValueOnce(mockWritable)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)
		mocks.fileType.mockResolvedValueOnce(mockReadable)
		mocks.pipeline.mockResolvedValueOnce(undefined)
		mocks.randomBytes.mockImplementationOnce(() => random)
		mockRequest.path = 'file.html'

		const asset = await util.makePieceAttachment(markdown.filePath, field, mockRequest, storage)

		expect(asset).toBe(
			`${ASSETS_DIRECTORY}/cover/${markdown.filePath}-${random.toString('hex')}.html`
		)
	})

	test('makePieceAttachment with readable filetype found', async () => {
		const mockRequest = new PassThrough() as unknown as ReadStream
		const mockReadable = new PassThrough() as unknown as AnyWebReadableByteStreamWithFileType
		const mockWritable = new PassThrough() as unknown as WriteStream
		const markdown = makeMarkdownSample()
		const field = { name: 'cover', type: 'string', format: 'asset' } as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = Buffer.from('random')

		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValueOnce(undefined)
		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockResolvedValueOnce(mockWritable)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)
		mocks.fileType.mockResolvedValueOnce({
			...mockReadable,
			fileType: { ext: 'jpg', mime: 'image/jpeg' },
		})
		mocks.pipeline.mockResolvedValueOnce(undefined)
		mocks.randomBytes.mockImplementationOnce(() => random)

		const asset = await util.makePieceAttachment(markdown.filePath, field, mockRequest, storage)

		expect(asset).toBe(
			`${ASSETS_DIRECTORY}/cover/${markdown.filePath}-${random.toString('hex')}.jpg`
		)
	})

	test('makePieceAttachment on array filed', async () => {
		const mockRequest = new PassThrough() as unknown as Request
		const mockReadable = new PassThrough() as unknown as AnyWebReadableByteStreamWithFileType
		const mockWritable = new PassThrough() as unknown as WriteStream
		const markdown = makeMarkdownSample()
		const field = {
			name: 'cover',
			type: 'array',
			items: { format: 'asset' },
		} as PieceFrontmatterSchemaField
		const storage = makeStorage('root')
		const random = Buffer.from('random')

		spies.makeDir = vi.spyOn(storage, 'makeDirectory').mockResolvedValueOnce(undefined)
		spies.createWriteStream = vi
			.spyOn(storage, 'createWriteStream')
			.mockResolvedValueOnce(mockWritable)
		spies.exists = vi.spyOn(storage, 'exists').mockResolvedValueOnce(false)
		mocks.fileType.mockResolvedValueOnce(mockReadable)
		mocks.pipeline.mockResolvedValueOnce(undefined)
		mocks.randomBytes.mockImplementationOnce(() => random)
		mockRequest.requestUrl = { pathname: 'file.html' } as URL

		const asset = await util.makePieceAttachment(markdown.filePath, field, mockRequest, storage)

		expect(asset).toBe(
			`${ASSETS_DIRECTORY}/cover/${markdown.filePath}-${random.toString('hex')}.html`
		)
	})
})
