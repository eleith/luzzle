import log from '../../log.js'
import { describe, expect, test, vi, afterEach } from 'vitest'
import type { AttachArgv } from './attach.js';
import command from './attach.js'
import type { Arguments, Argv } from 'yargs'

import { makeContext, makeMarkdownSample, makePieceMock } from '../utils/context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../utils/pieces.js'
import { savePieceAsset } from '@luzzle/core'

vi.mock('../utils/pieces.js')
vi.mock('../../log.js')
vi.mock('@luzzle/core')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	parseArgs: vi.mocked(parsePiecePathPositionalArgv),
	makeCommand: vi.mocked(makePiecePathPositional),
	savePieceAsset: vi.mocked(savePieceAsset),
}

describe('lib/commands/attach.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
	})

	test('run successfully attaches a file', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		
		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.savePieceAsset.mockResolvedValueOnce('.assets/snippets/fibo/photo.png')

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg' } as Arguments<AttachArgv>)

		expect(mocks.savePieceAsset).toHaveBeenCalledWith(
			markdown.filePath,
			'photo.jpg',
			ctx.storage,
			{ name: undefined }
		)
		expect(consoleSpy).toHaveBeenCalledWith('.assets/snippets/fibo/photo.png')
		consoleSpy.mockRestore()
	})

	test('run handles savePieceAsset write error', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()

		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.savePieceAsset.mockRejectedValueOnce(new Error('disk full'))

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg' } as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledWith('failed to attach file: disk full')
	})

	test('run dry-run with local file', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		ctx.flags.dryRun = true

		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg' } as Arguments<AttachArgv>)

		expect(mocks.logInfo).toHaveBeenCalledWith(
			`[dry-run] would attach photo.jpg to ${markdown.filePath}`
		)
		expect(mocks.savePieceAsset).not.toHaveBeenCalled()
	})

	test('run dry-run with URL', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		ctx.flags.dryRun = true

		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'https://user:password@example.com/private-token?signature=secret' } as Arguments<AttachArgv>)

		expect(mocks.logInfo).toHaveBeenCalledWith(
			`[dry-run] would download and attach from https://example.com to ${markdown.filePath}`
		)
		expect(mocks.savePieceAsset).not.toHaveBeenCalled()
	})

	test('run dry-run treats an unparseable URL as a file path', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		ctx.flags.dryRun = true
		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'https://[secret?signature=private' } as Arguments<AttachArgv>)

		expect(mocks.logInfo).toHaveBeenCalledWith(
			`[dry-run] would attach https://[secret?signature=private to ${markdown.filePath}`
		)
	})

	test('run logs only the origin when a URL attachment fails', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		const url = 'https://user:password@example.com/private-token?signature=secret'
		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.savePieceAsset.mockRejectedValueOnce(new Error(`Request failed for ${url}`))

		await command.run(ctx, { piece: 'snippets/fibo.md', file: url } as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledWith(
			'failed to attach downloaded file from https://example.com'
		)
	})

	test('run successfully attaches a file with custom name', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		
		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.savePieceAsset.mockResolvedValueOnce('.assets/snippets/fibo/chart.png')

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg', name: 'chart' } as Arguments<AttachArgv>)

		expect(mocks.savePieceAsset).toHaveBeenCalledWith(
			markdown.filePath,
			'photo.jpg',
			ctx.storage,
			{ name: 'chart' }
		)
		expect(consoleSpy).toHaveBeenCalledWith('.assets/snippets/fibo/chart.png')
		consoleSpy.mockRestore()
	})

	test('builder configures options', async () => {
		const positionalMock = vi.fn().mockReturnThis()
		const optionMock = vi.fn().mockReturnThis()
		const args = {
			positional: positionalMock,
			option: optionMock,
		} as unknown as Argv<AttachArgv>

		mocks.makeCommand.mockReturnValueOnce(args)

		command.builder?.(args)

		expect(mocks.makeCommand).toHaveBeenCalledOnce()
		expect(positionalMock).toHaveBeenCalledWith('file', expect.objectContaining({
			type: 'string',
		}))
		expect(optionMock).toHaveBeenCalledWith('name', expect.objectContaining({
			alias: 'n',
			type: 'string',
		}))
	})
})
