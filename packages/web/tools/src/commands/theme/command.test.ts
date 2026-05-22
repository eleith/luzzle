import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateTheme from './index.js'
import { getConfig } from '../../lib/config.js'
import { Argv } from 'yargs'
import { Config } from '@luzzle/web.config'

vi.mock('./index.js')
vi.mock('../../lib/config.js')

const mocks = {
	generateTheme: vi.mocked(generateTheme),
	getConfig: vi.mocked(getConfig),
}

describe('theme command', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should configure the command and call generateTheme', async () => {
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
			'theme',
			expect.any(String),
			expect.any(Function),
			expect.any(Function)
		)

		const yargsMock = { options: vi.fn() }
		builder(yargsMock)
		expect(yargsMock.options).toHaveBeenCalled()

		const config = { theme: {} } as Config
		mocks.getConfig.mockReturnValue(config)

		const argv = {
			config: '/path/to/config.yaml',
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.generateTheme).toHaveBeenCalledWith(
			config
		)
	})
})
