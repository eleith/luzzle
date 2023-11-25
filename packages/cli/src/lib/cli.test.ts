import { stat } from 'fs/promises'
import { getDatabaseClient, migrate } from '@luzzle/kysely'
import log from './log.js'
import cli from './cli.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { getDirectoryFromConfig, getConfig, Config } from './config.js'
import commands from './commands/index.js'
import { mockDatabase } from './database.mock.js'

vi.mock('os')
vi.mock('fs/promises')
vi.mock('@luzzle/kysely')
vi.mock('./config')
vi.mock('./commands/index')
vi.mock('./pieces/index')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	logLevelSet: vi.spyOn(log, 'level', 'set'),
	stat: vi.mocked(stat),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	getDirectoryConfig: vi.mocked(getDirectoryFromConfig),
	getConfig: vi.mocked(getConfig),
	migrate: vi.mocked(migrate),
}

const spies: SpyInstance[] = []

describe('lib/cli', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.forEach((spy) => {
			spy.mockRestore()
		})
	})

	test(`run init`, async () => {
		const config = {} as Config

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')

		const spyRun = vi.spyOn(commands.init, 'run')
		spyRun.mockResolvedValueOnce(undefined)

		process.argv = ['node', 'cli', commands.init.name, 'test']

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(spyRun).toHaveBeenCalledOnce()
	})

	test(`run init with dryRun`, async () => {
		const config = {} as Config

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')

		const spyRun = vi.spyOn(commands.init, 'run')
		spyRun.mockResolvedValueOnce(undefined)

		process.argv = ['node', 'cli', commands.init.name, '--dry-run', 'test']

		await cli()

		expect(mocks.logChild).toHaveBeenCalledWith({ dryRun: true }, { level: 'info' })
		expect(spyRun).toHaveBeenCalledOnce()
	})

	test(`run edit-config`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})

		const spyRun = vi.spyOn(commands.editConfig, 'run')
		spyRun.mockResolvedValueOnce(undefined)

		process.argv = ['node', 'cli', commands.editConfig.name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(spyRun).toHaveBeenCalledOnce()
		expect(kysely.db.destroy).toHaveBeenCalledOnce()
	})

	test(`run fails migration`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({ error: 'some error' })

		const spyRun = vi.spyOn(commands.editConfig, 'run')
		spyRun.mockRejectedValueOnce(new Error('some error'))

		process.argv = ['node', 'cli', commands.editConfig.name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(spyRun).not.toHaveBeenCalled()
		expect(kysely.db.destroy).toHaveBeenCalledOnce()
	})

	test(`run catches an error`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})

		const spyRun = vi.spyOn(commands.editConfig, 'run')
		spyRun.mockRejectedValueOnce(new Error('some error'))

		spies.push(spyRun)

		process.argv = ['node', 'cli', commands.editConfig.name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(spyRun).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test(`run catches a rejection`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})

		const spyRun = vi.spyOn(commands.editConfig, 'run')
		spyRun.mockRejectedValueOnce('')

		spies.push(spyRun)

		process.argv = ['node', 'cli', commands.editConfig.name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(spyRun).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})
})
