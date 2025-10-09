import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateTheme from './index.js'
import { Argv } from 'yargs'
import { type Config, loadConfig, setConfigValue } from '../../lib/config/config.js'
import { writeFileSync } from 'fs'
import yaml from 'yaml'

vi.mock('./index.js')
vi.mock('../../lib/config/config.js')
vi.mock('fs')
vi.mock('yaml')

const mocks = {
	generateTheme: vi.mocked(generateTheme),
	loadConfig: vi.mocked(loadConfig),
	setConfigValue: vi.mocked(setConfigValue),
	writeFileSync: vi.mocked(writeFileSync),
	yamlStringify: vi.mocked(yaml.stringify),
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
		expect(yargsMock.options).toHaveBeenCalled()

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

	test('should set config value when css is generated', async () => {
		const handler = vi.fn()
		const cli = {
			command: vi.fn((_cmd, _desc, _b, h) => {
				handler.mockImplementation(h)
				return cli
			}),
		}

		command(cli as unknown as Argv)

		mocks.generateTheme.mockResolvedValue('path/to/theme.css')
		mocks.loadConfig.mockReturnValue({} as Config)

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
		expect(mocks.loadConfig).toHaveBeenCalledWith('/path/to/config.yaml')
		expect(mocks.setConfigValue).toHaveBeenCalledWith({}, 'paths.css.theme', 'path/to/theme.css')
		expect(mocks.writeFileSync).toHaveBeenCalledWith('/path/to/config.yaml', undefined)
		expect(mocks.yamlStringify).toHaveBeenCalledWith({})
	})
})