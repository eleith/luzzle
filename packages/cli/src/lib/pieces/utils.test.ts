import { createReadStream, existsSync, ReadStream, Stats } from 'fs'
import { copyFile, stat } from 'fs/promises'
import { temporaryFile } from 'tempy'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import yargs from 'yargs'
import { downloadToPath } from '../web.js'
import { createHash } from 'crypto'
import { PassThrough } from 'stream'
import { makeContext } from '../commands/context.fixtures.js'
import * as util from './utils.js'
import Piece from './piece.js'
import { makeMarkdownSample, makePieceMock } from './piece.fixtures.js'

vi.mock('fs')
vi.mock('tempy')
vi.mock('fs/promises')
vi.mock('../web.js')
vi.mock('crypto')

const mocks = {
	tempyFile: vi.mocked(temporaryFile),
	copyFile: vi.mocked(copyFile),
	stat: vi.mocked(stat),
	downloadToPath: vi.mocked(downloadToPath),
	existsSync: vi.mocked(existsSync),
	createReadStream: vi.mocked(createReadStream),
	createHash: vi.mocked(createHash),
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

	test('downloadFileOrUrlTo with url', async () => {
		const url = 'https://somewhere'
		const tmpPath = '/tmp/somewhere.jpg'

		mocks.tempyFile.mockReturnValueOnce(tmpPath)
		mocks.downloadToPath.mockResolvedValueOnce(true)

		const file = await util.downloadFileOrUrlTo(url)

		expect(file).toEqual(tmpPath)
		expect(mocks.downloadToPath).toHaveBeenCalledWith(url, tmpPath)
	})

	test('downloadFileOrUrlTo with file', async () => {
		const filePath = 'path/to/file'
		const tmpPath = '/tmp/somewhere.jpg'

		mocks.tempyFile.mockReturnValueOnce(tmpPath)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		const file = await util.downloadFileOrUrlTo(filePath)

		expect(file).toEqual(tmpPath)
		expect(mocks.copyFile).toHaveBeenCalledWith(filePath, tmpPath)
	})

	test('downloadFileOrUrlTo with directory', async () => {
		const filePath = 'path/to/file'
		const tmpPath = '/tmp/somewhere.jpg'

		mocks.tempyFile.mockReturnValueOnce(tmpPath)
		mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)

		const download = util.downloadFileOrUrlTo(filePath)

		expect(download).rejects.toThrowError()
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
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockReturnValueOnce(piece)

		const result = await util.parsePieceOptionArgv(context, { piece: name })

		expect(result.piece).toBeInstanceOf(Piece)
	})

	test('parsePieceOptionArgv throws', async () => {
		const name = 'links'
		const context = makeContext()

		spies.getTypes = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])

		const parsing = util.parsePieceOptionArgv(context, { piece: name })

		expect(parsing).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}.md`
		const piece = new MockPiece()
		const markdown = makeMarkdownSample()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockReturnValueOnce(piece)
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
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockReturnValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)

		const parsing = util.parsePiecePathPositionalArgv(context, { piece: path })

		expect(parsing).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv does not exist', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}.md`
		const piece = new MockPiece()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockReturnValueOnce(piece)
		spies.get = vi.spyOn(piece, 'get').mockRejectedValueOnce(new Error('error'))

		const resulting = util.parsePiecePathPositionalArgv(context, { piece: path })

		expect(resulting).rejects.toThrow()
	})

	test('parsePiecePathPositionalArgv invalid piece type', async () => {
		const name = 'books'
		const context = makeContext()
		const MockPiece = makePieceMock()
		const path = `./path/file.${name}-2.md`
		const piece = new MockPiece()

		spies.findPieceNames = vi.spyOn(context.pieces, 'getTypes').mockResolvedValueOnce(['books'])
		spies.getPiece = vi.spyOn(context.pieces, 'getPiece').mockReturnValueOnce(piece)

		const resulting = util.parsePiecePathPositionalArgv(context, { piece: path })

		expect(resulting).rejects.toThrow()
	})

	test('calculateHashFromFile', async () => {
		const file = 'path/to/file'
		const data = 'data'

		const mockUpdate = vi.fn()
		const mockDigest = vi.fn().mockReturnValue(data)
		const mockReadStream = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(mockReadStream)
		mocks.createHash.mockReturnValueOnce({
			update: mockUpdate,
			digest: mockDigest,
		} as unknown as ReturnType<typeof createHash>)

		const hashPromise = util.calculateHashFromFile(file)

		mockReadStream.emit('data', data)
		mockReadStream.emit('end')

		const hash = await hashPromise

		expect(mockUpdate).toHaveBeenCalled()
		expect(mockDigest).toHaveBeenCalledWith('hex')
		expect(hash).toEqual(data)
	})

	test('calculateHashFromFile error', async () => {
		const file = 'path/to/file'
		const data = 'data'

		const mockUpdate = vi.fn()
		const mockDigest = vi.fn().mockReturnValue(data)
		const mockReadStream = new PassThrough() as unknown as ReadStream

		mocks.createReadStream.mockReturnValueOnce(mockReadStream)
		mocks.createHash.mockReturnValueOnce({
			update: mockUpdate,
			digest: mockDigest,
		} as unknown as ReturnType<typeof createHash>)

		const hashPromise = util.calculateHashFromFile(file)

		mockReadStream.emit('error', new Error('error'))

		expect(hashPromise).rejects.toThrowError()
	})
})
