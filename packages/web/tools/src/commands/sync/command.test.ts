import { describe, test, expect, vi, afterEach } from 'vitest'
import command from './command.js'
import sync from './index.js'
import { Argv } from 'yargs'

vi.mock('./index.js')

const mocks = {
	sync: vi.mocked(sync),
}

describe('sync command', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should configure the command and call sync', async () => {
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
			'sync',
			expect.any(String),
			expect.any(Function),
			expect.any(Function)
		)

		const yargsMock = { options: vi.fn() }
		builder(yargsMock)
		expect(yargsMock.options).toHaveBeenCalled()

		const argv = {
			config: '/path/to/config.yaml',
			in: '/luzzle',
			'dry-run': true,
			force: true,
			prune: true,
			$0: '',
			_: [],
		}
		await handler(argv)

		expect(mocks.sync).toHaveBeenCalledWith({
			configPath: '/path/to/config.yaml',
			archiveDir: '/luzzle',
			dryRun: true,
			force: true,
			prune: true,
		})
	})
})