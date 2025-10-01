import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateTheme from './index.js'
import { Argv } from 'yargs'

vi.mock('./index.js')

const mocks = {
	generateTheme: vi.mocked(generateTheme),
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
			'generate theme css',
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
			out: {
				type: 'string',
				description: 'path to direct asset output',
				alias: 'o',
			},
			minify: {
				type: 'boolean',
				description: 'minify output css',
				default: false,
			},
		})

		const argv = {
			config: '/path/to/config.yaml',
			out: '/path/to/out',
			minify: true,
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.generateTheme).toHaveBeenCalledWith(
			'/path/to/config.yaml',
			'/path/to/out',
			true
		)
	})
})
