import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateAssets from './index.js'
import { Argv } from 'yargs'

vi.mock('./index.js')

const mocks = {
	generateAssets: vi.mocked(generateAssets),
}

describe('assets command', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should configure the command and call generateAssets', async () => {
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
			'assets',
			'copy piece assets and generate image variants',
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
			luzzle: {
				type: 'string',
				description: 'path to luzzle directory',
				alias: 'in',
				demandOption: true,
			},
			out: {
				type: 'string',
				description: 'path to direct asset output',
				alias: 'o',
				demandOption: true,
			},
			limit: {
				type: 'number',
				description: 'maximum number of items to process, used for testing',
				default: Infinity,
			},
			force: {
				type: 'boolean',
				description: 'force processing of all items, irrespective of last modiified times',
				default: false,
				alias: 'f',
			},
		})

		const argv = {
			config: '/path/to/config.yaml',
			luzzle: '/path/to/luzzle',
			out: '/path/to/out',
			limit: 10,
			force: true,
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.generateAssets).toHaveBeenCalledWith(
			'/path/to/config.yaml',
			'/path/to/luzzle',
			'/path/to/out',
			{
				limit: 10,
				force: true,
			}
		)
	})
})
