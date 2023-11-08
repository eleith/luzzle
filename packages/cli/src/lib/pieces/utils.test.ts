import { Stats } from 'fs'
import { copyFile, stat } from 'fs/promises'
import { temporaryFile } from 'tempy'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { downloadToPath } from '../web.js'
import { downloadFileOrUrlTo } from './utils.js'

vi.mock('fs')
vi.mock('tempy')
vi.mock('fs/promises')
vi.mock('../web.js')

const mocks = {
	tempyFile: vi.mocked(temporaryFile),
	copyFile: vi.mocked(copyFile),
	stat: vi.mocked(stat),
	downloadToPath: vi.mocked(downloadToPath),
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
})
