import { createReadStream, existsSync, ReadStream, Stats } from 'fs'
import { copyFile, stat } from 'fs/promises'
import { temporaryFile } from 'tempy'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import yargs from 'yargs'
import { downloadToPath } from '../web.js'
import {
	downloadFileOrUrlTo,
	makeOptionalPieceCommand,
	makePieceCommand,
	parseOptionalPieceArgv,
	parsePieceArgv,
	calculateHashFromFile,
} from './utils.js'
import { createHash } from 'crypto'
import { PassThrough } from 'stream'
import path from 'path'
import { makeContext } from '../commands/context.fixtures.js'

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

		const file = await downloadFileOrUrlTo(url)

		expect(file).toEqual(tmpPath)
		expect(mocks.downloadToPath).toHaveBeenCalledWith(url, tmpPath)
	})

	test('downloadFileOrUrlTo with file', async () => {
		const filePath = 'path/to/file'
		const tmpPath = '/tmp/somewhere.jpg'

		mocks.tempyFile.mockReturnValueOnce(tmpPath)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)

		const file = await downloadFileOrUrlTo(filePath)

		expect(file).toEqual(tmpPath)
		expect(mocks.copyFile).toHaveBeenCalledWith(filePath, tmpPath)
	})

	test('downloadFileOrUrlTo with directory', async () => {
		const filePath = 'path/to/file'
		const tmpPath = '/tmp/somewhere.jpg'

		mocks.tempyFile.mockReturnValueOnce(tmpPath)
		mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)

		const download = downloadFileOrUrlTo(filePath)

		expect(download).rejects.toThrowError()
	})

	test('makePieceCommand', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		makePieceCommand(args)

		expect(spies.option).toHaveBeenCalledTimes(2)
		expect(spies.positional).toHaveBeenCalledOnce()
	})

	test('makeOptionalPieceCommand', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		spies.positional = vi.spyOn(args, 'positional')

		makeOptionalPieceCommand(args)

		expect(spies.option).toHaveBeenCalledTimes(2)
		expect(spies.positional).toHaveBeenCalledOnce()
	})

	test('parsePieceArgv', async () => {
		const name = 'piece'
		const slug = 'slug'
		const context = makeContext()

		spies.findPieceNames = vi.spyOn(context.pieces, 'findPieceNames').mockResolvedValueOnce([name])

		const result = await parsePieceArgv(context, { piece: name, path: slug })

		expect(result).toEqual({
			name,
			slug,
		})
	})

	test('parsePieceArgv piece does not exist', async () => {
		const name = 'piece'
		const slug = 'slug'
		const context = makeContext()

		spies.findPieceNames = vi.spyOn(context.pieces, 'findPieceNames').mockResolvedValueOnce([name])

		const parsing = parsePieceArgv(context, { piece: 'fake piece', path: slug })

		expect(parsing).rejects.toThrow()
	})

	test('parsePieceArgv with direct path', async () => {
		const name = 'piece'
		const slug = 'slug'
		const context = makeContext()
		const path = `./path/${name}/${slug}.md`

		mocks.existsSync.mockReturnValueOnce(true)

		const result = await parsePieceArgv(context, { path })

		expect(result).toEqual({
			name,
			slug,
		})
	})

	test('parsePieceArgv with path without a dir', async () => {
		const name = 'piece'
		const slug = 'slug'
		const context = makeContext()

		spies.resolve = vi.spyOn(path, 'resolve').mockReturnValueOnce('/piece/slug')
		mocks.existsSync.mockReturnValueOnce(true)

		const result = await parsePieceArgv(context, { path: 'slug.md' })

		expect(result).toEqual({
			name,
			slug,
		})
	})

	test('parsePieceArgv file does not exist', async () => {
		const piece = 'piece'
		const slug = 'slug'
		const path = `./path/${piece}/${slug}.md`
		const context = makeContext()

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => parsePieceArgv(context, { path })).rejects.toThrow()
	})

	test('parsePieceArgv slug without a piece', async () => {
		const slug = 'slug'
		const context = makeContext()

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => parsePieceArgv(context, { path: slug })).rejects.toThrow()
	})

	test('parsePieceArgv invalid piece', async () => {
		const path = 'path/to/non-slug.png'
		const context = makeContext()

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => parsePieceArgv(context, { path })).rejects.toThrow()
	})

	test('parseOptionalPieceArgv with direct path', async () => {
		const context = makeContext()
		const result = await parseOptionalPieceArgv(context, {})

		expect(result).toBeNull()
	})

	test('parseOptionalPieceArgv piece without slug', async () => {
		const context = makeContext()
		const result = await parseOptionalPieceArgv(context, { piece: 'piece' })

		expect(result).toEqual({ name: 'piece' })
	})

	test('parseOptionalPieceArgv calls parsePieceArgv', async () => {
		const name = 'piece'
		const slug = 'slug'
		const path = `path/to/${name}/${slug}.md`
		const context = makeContext()

		mocks.existsSync.mockReturnValueOnce(true)

		const result = await parseOptionalPieceArgv(context, { path })

		expect(result).toEqual({ name, slug })
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

		const hashPromise = calculateHashFromFile(file)

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

		const hashPromise = calculateHashFromFile(file)

		mockReadStream.emit('error', new Error('error'))

		expect(hashPromise).rejects.toThrowError()
	})
})
