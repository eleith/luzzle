import { getDatabaseClient, migrate } from '@luzzle/core'
import log from './log.js'
import cli from './cli.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { getDatabasePath, getConfig, Config } from './config.js'
import getCommands from './commands/index.js'
import { mockDatabase } from './database.mock.js'

vi.mock('@luzzle/core')
vi.mock('./config.js')
vi.mock('./pieces/index.js')
vi.mock('./commands/index.js', () => { return { default: vi.fn() } })

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	logLevelSet: vi.spyOn(log, 'level', 'set'),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	getDatabasePath: vi.mocked(getDatabasePath),
	getConfig: vi.mocked(getConfig),
	migrate: vi.mocked(migrate),
	getCommands: vi.mocked(getCommands),
}

const spies: MockInstance[] = []

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
		const run = vi.fn()
		const name = 'init'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getCommands.mockResolvedValueOnce({
			init: {
				run,
				name,
				command: 'init [directory]',
				describe: 'init description',
				builder: vi.fn()
			},
		})

		process.argv = ['node', 'cli', name, 'test']

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(run).toHaveBeenCalledOnce()
	})

	test(`run init with dryRun`, async () => {
		const config = {} as Config
		const run = vi.fn()
		const name = 'init'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getCommands.mockResolvedValueOnce({
			init: {
				run,
				name,
				command: 'init [directory]',
				describe: 'init description',
				builder: vi.fn()
			},
		})


		process.argv = ['node', 'cli', name, '--dry-run', 'test']

		await cli()

		expect(mocks.logChild).toHaveBeenCalledWith({ dryRun: true }, { level: 'info' })
		expect(run).toHaveBeenCalledOnce()
	})

	test(`run test command`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()
		const run = vi.fn()
		const name = 'command1'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})
		mocks.getCommands.mockResolvedValueOnce({
			command1: {
				run,
				name,
				command: 'command1',
				describe: 'command1 description',
				builder: vi.fn()
			},
		})

		process.argv = ['node', 'cli', name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(run).toHaveBeenCalledOnce()
		expect(kysely.db.destroy).toHaveBeenCalledOnce()
	})

	test(`run test command with verbose`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()
		const run = vi.fn()
		const name = 'command1'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})
		mocks.getCommands.mockResolvedValueOnce({
			command1: {
				run,
				name,
				command: 'command1',
				describe: 'command1 description',
				builder: vi.fn()
			},
		})

		process.argv = ['node', 'cli', name, '--verbose']

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('info')
		expect(run).toHaveBeenCalledOnce()
		expect(kysely.db.destroy).toHaveBeenCalledOnce()
	})

	test(`run fails migration on test command`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()
		const run = vi.fn()
		const name = 'command1'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({ error: 'some error' })
		mocks.getCommands.mockResolvedValueOnce({
			command1: {
				run,
				name,
				command: 'command1',
				describe: 'command1 description',
				builder: vi.fn()
			},
		})

		process.argv = ['node', 'cli', name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(run).not.toHaveBeenCalled()
		expect(kysely.db.destroy).toHaveBeenCalledOnce()
	})

	test(`run catches an error`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()
		const run = vi.fn()
		const name = 'command1'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})
		mocks.getCommands.mockResolvedValueOnce({
			command1: {
				run,
				name,
				command: 'command1',
				describe: 'command1 description',
				builder: vi.fn()
			},
		})
		run.mockRejectedValueOnce(new Error('oops'))

		process.argv = ['node', 'cli', name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(run).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test(`run catches a rejection`, async () => {
		const config = {} as Config
		const kysely = mockDatabase()
		const run = vi.fn()
		const name = 'command1'

		mocks.getConfig.mockReturnValueOnce(config)
		mocks.getDatabasePath.mockReturnValueOnce('somewhere')
		mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)
		mocks.migrate.mockResolvedValueOnce({})
		mocks.getCommands.mockResolvedValueOnce({
			command1: {
				run,
				name,
				command: 'command1',
				describe: 'command1 description',
				builder: vi.fn()
			},
		})
		run.mockRejectedValueOnce('oops')

		process.argv = ['node', 'cli', name]

		await cli()

		expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
		expect(run).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})
})
