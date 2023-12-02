import { existsSync, Stats } from 'fs'
import { copyFile, stat } from 'fs/promises'
import { temporaryFile } from 'tempy'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import yargs from 'yargs'
import { downloadToPath } from '../web.js'
import {
	downloadFileOrUrlTo,
	makeOptionalPieceCommand,
	makePieceCommand,
	parseOptionalPieceArgv,
	parsePieceArgv,
} from './utils.js'

vi.mock('fs')
vi.mock('tempy')
vi.mock('fs/promises')
vi.mock('../web.js')

const mocks = {
	tempyFile: vi.mocked(temporaryFile),
	copyFile: vi.mocked(copyFile),
	stat: vi.mocked(stat),
	downloadToPath: vi.mocked(downloadToPath),
	existsSync: vi.mocked(existsSync),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/pieces/utils', () => {
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

	test('parsePieceArgv', () => {
		const piece = 'piece'
		const slug = 'slug'
		const result = parsePieceArgv({ piece, path: slug })

		expect(result).toEqual({
			piece,
			slug,
		})
	})

	test('parsePieceArgv with direct path', () => {
		const piece = 'piece'
		const slug = 'slug'
		const path = `./path/${piece}/${slug}.md`

		mocks.existsSync.mockReturnValueOnce(true)

		const result = parsePieceArgv({ path })

		expect(result).toEqual({
			piece,
			slug,
		})
	})

	test('parsePieceArgv file does not exist', () => {
		const piece = 'piece'
		const slug = 'slug'
		const path = `./path/${piece}/${slug}.md`

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => parsePieceArgv({ path })).toThrow()
	})

	test('parsePieceArgv slug without a piece', () => {
		const slug = 'slug'

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => parsePieceArgv({ path: slug })).toThrow()
	})

	test('parsePieceArgv invalid piece', () => {
		const path = 'path/to/non-slug.png'

		mocks.existsSync.mockReturnValueOnce(false)

		expect(() => parsePieceArgv({ path })).toThrow()
	})

	test('parseOptionalPieceArgv with direct path', () => {
		const result = parseOptionalPieceArgv({})

		expect(result).toBeNull()
	})

	test('parseOptionalPieceArgv piece without slug', () => {
		expect(() => parseOptionalPieceArgv({ piece: 'piece' })).toThrow()
	})

	test('parseOptionalPieceArgv calls parsePieceArgv', () => {
		const piece = 'piece'
		const slug = 'slug'
		const path = `path/to/${piece}/${slug}.md`

		mocks.existsSync.mockReturnValueOnce(true)

		const result = parseOptionalPieceArgv({ path })

		expect(result).toEqual({ piece, slug })
	})
})
