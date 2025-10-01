import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import checkConfig from './index.js'
import { Argv } from 'yargs'

vi.mock('./index.js')

const mocks = {
	checkConfig: vi.mocked(checkConfig),
}

describe('validate command', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should configure the command and call checkConfig', async () => {
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
			'validate',
			'validate config file',
			expect.any(Function),
			expect.any(Function)
		)

		const yargsMock = { options: vi.fn() }
		builder(yargsMock)
		expect(yargsMock.options).toHaveBeenCalledWith({
			config: {
				type: 'string',
				description: 'path to config.yaml',
				demandOption: true,
			},
		})

		const argv = {
			config: '/path/to/config.yaml',
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.checkConfig).toHaveBeenCalledWith('/path/to/config.yaml')
	})
})
