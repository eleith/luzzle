import { describe, expect, test, vi, afterEach } from 'vitest'
import { readdir } from 'fs/promises'
import getCommands from './index.js'
import { Dirent } from 'fs'

vi.mock('fs/promises')
vi.mock('path')

const mocks = {
	readdir: vi.mocked(readdir),
}

describe('lib/web', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
	})

	test('getCommands', async () => {
		mocks.readdir.mockResolvedValue([])

		const commands = await getCommands()

		expect(commands).toEqual({})
	})

	test('getCommands no js files', async () => {
		mocks.readdir.mockResolvedValue(['command1.json'] as unknown as Dirent<Buffer<ArrayBufferLike>>[])

		const commands = await getCommands()

		expect(commands).toEqual({})
	})

	test('getCommands returns field.js command', async () => {
		mocks.readdir.mockResolvedValue(['field.js'] as unknown as Dirent<Buffer<ArrayBufferLike>>[])

		const commands = await getCommands()

		expect(commands.field.name).toBe('field')
	})
})
