import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateSqlite from './index.js'
import { getConfig } from '../../lib/config.js'
import { Argv } from 'yargs'
import { Config } from '@luzzle/web.utils'

vi.mock('./index.js')
vi.mock('../../lib/config.js')

const mocks = {
	generateSqlite: vi.mocked(generateSqlite),
	getConfig: vi.mocked(getConfig),
}

describe('sqlite command', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should configure the command and call generateSqlite', async () => {
		const handler = vi.fn()
		const builder = vi.fn()
		const cli = {
			command: vi.fn((_cmd, _desc, b, h) => {
				builder.mockImplementation(b)
				handler.mockImplementation(h)
				return cli
			}),
		}

		command(cli as unknown as Argv)

		expect(cli.command).toHaveBeenCalledWith(
			'sqlite',
			'generate sqlite database for web',
			expect.any(Function),
			expect.any(Function)
		)

		const yargsMock = { options: vi.fn() }
		builder(yargsMock)
		expect(yargsMock.options).toHaveBeenCalledWith({
			config: {
				type: 'string',
				description: 'path to config.yaml',
			},
		})

		const config = { paths: { database: 'test' } } as Config
		mocks.getConfig.mockReturnValue(config)

		const argv = {
			config: '/path/to/config.yaml',
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.generateSqlite).toHaveBeenCalledWith(config)
	})
})
