import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateOpenGraphs from './index.js'
import { Argv } from 'yargs'

vi.mock('./index.js')

const mocks = {
	generateOpenGraphs: vi.mocked(generateOpenGraphs),
}

describe('opengraph command', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should configure the command and call generateOpenGraphs', async () => {
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
			'opengraph',
			'generate open graph images',
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
			template: {
				type: 'string',
				description: 'eta template for open graph generation',
				demandOption: true,
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
			template: 'template.eta',
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.generateOpenGraphs).toHaveBeenCalledWith(
			'/path/to/config.yaml',
			'/path/to/luzzle',
			'/path/to/out',
			'template.eta',
			{
				limit: 10,
				force: true,
			}
		)
	})
})
