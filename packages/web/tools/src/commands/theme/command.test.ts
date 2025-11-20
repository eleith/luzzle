import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateTheme from './index.js'
import { Argv } from 'yargs'

vi.mock('./index.js')
vi.mock('../../lib/config/config.js')
vi.mock('fs')
vi.mock('yaml')

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
			expect.any(String),
			expect.any(Function),
			expect.any(Function)
		)

		const yargsMock = { options: vi.fn() }
		builder(yargsMock)
		expect(yargsMock.options).toHaveBeenCalled()

		const argv = {
			config: '/path/to/config.yaml',
			minify: true,
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.generateTheme).toHaveBeenCalledWith(
			'/path/to/config.yaml',
			true
		)
	})
})