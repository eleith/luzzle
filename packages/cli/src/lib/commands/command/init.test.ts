import log from '../../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { InitArgv } from './init.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { stat } from 'fs/promises'
import { existsSync, Stats } from 'fs'
import { getDatabaseClient, migrate } from '@luzzle/core'
import { mockConfig } from '../../config.mock.js'
import { getDatabasePath } from '../../config.js'

vi.mock('fs/promises')
vi.mock('@luzzle/core')
vi.mock('fs/promises')
vi.mock('fs')
vi.mock('../../log.js')
vi.mock('../../config.js')

const mocks = {
	logWarn: vi.spyOn(log, 'warn'),
	existsSync: vi.mocked(existsSync),
	stat: vi.mocked(stat),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	migrate: vi.mocked(migrate),
	getDatabasePath: vi.mocked(getDatabasePath)
}

const spies: { [key: string]: MockInstance } = {}

describe('tools/lib/commands/init', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('run', async () => {
		const config = mockConfig()
		const ctx = makeContext({ config })
		const dir = 'luzzle-dir'

		mocks.getDatabasePath.mockReturnValueOnce(dir)
		mocks.stat.mockResolvedValueOnce({ isDirectory: () => true } as Stats)
		mocks.stat.mockResolvedValueOnce({} as Stats)

		await command.run(ctx, { dir } as Arguments<InitArgv>)

		expect(mocks.getDatabaseClient).toHaveBeenCalledOnce()
		expect(mocks.migrate).toHaveBeenCalledOnce()
	})

	test('run with existing config', async () => {
		const config = mockConfig()
		const ctx = makeContext({ config })
		const dir = 'luzzle-dir'

		mocks.getDatabasePath.mockReturnValueOnce(dir)
		mocks.stat.mockResolvedValueOnce({ isDirectory: () => true } as Stats)
		mocks.stat.mockRejectedValueOnce(new Error('nope'))

		await command.run(ctx, { dir } as Arguments<InitArgv>)

		expect(mocks.getDatabaseClient).toHaveBeenCalledOnce()
		expect(mocks.migrate).toHaveBeenCalledOnce()
		expect(mocks.logWarn).toHaveBeenCalledOnce()
	})

	test('run with dry run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const dir = 'luzzle-dir'

		mocks.getDatabasePath.mockReturnValueOnce(dir)
		mocks.stat.mockResolvedValueOnce({ isDirectory: () => true } as Stats)
		mocks.stat.mockResolvedValueOnce({} as Stats)

		await command.run(ctx, { dir } as Arguments<InitArgv>)

		expect(mocks.getDatabaseClient).not.toHaveBeenCalledOnce()
		expect(mocks.migrate).not.toHaveBeenCalledOnce()
	})

	test('run with invalid dir', async () => {
		const ctx = makeContext()
		const dir = 'luzzle-dir'

		mocks.getDatabasePath.mockReturnValueOnce(dir)
		mocks.stat.mockResolvedValueOnce({ isDirectory: () => false } as Stats)

		const run = command.run(ctx, { dir } as Arguments<InitArgv>)

		await expect(run).rejects.toThrow()
	})

	test('builder', async () => {
		const args = yargs()

		spies.positional = vi.spyOn(args, 'positional')
		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledOnce()
	})
})
