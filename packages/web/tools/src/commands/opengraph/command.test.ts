import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import generateOpenGraphs from './index.js'
import { getConfig } from '../../lib/config.js'
import { Argv } from 'yargs'
import { Config } from '@luzzle/web.utils'

vi.mock('./index.js')
vi.mock('../../lib/config.js')

const mocks = {
	generateOpenGraphs: vi.mocked(generateOpenGraphs),
	getConfig: vi.mocked(getConfig),
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
			},
			out: {
				type: 'string',
				description: 'path to direct asset output',
				alias: 'o',
				demandOption: true,
			},
			host: {
				type: 'string',
				description: 'host to use for generating open graph images',
			},
			id: {
				type: 'string',
				description: 'id of just one item to process',
			},
			force: {
				type: 'boolean',
				description: 'force processing of all items, irrespective of last modified times',
				default: false,
				alias: 'f',
			},
		})

		const config = { url: { app: 'test-host' } } as Config
		mocks.getConfig.mockReturnValue(config)

		await handler({
			config: 'test',
			out: 'test',
			host: 'test-host',
			id: 'test-id',
			force: true,
		})

		expect(mocks.generateOpenGraphs).toHaveBeenCalledWith(
			{
				outputDir: 'test',
				host: 'test-host',
				id: 'test-id',
				force: true,
			},
			config
		)
	})
})
