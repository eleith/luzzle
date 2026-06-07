import log from '../../log.js'
import { describe, expect, test, vi, afterEach } from 'vitest'
import command, { AttachArgv } from './attach.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext, makeMarkdownSample, makePieceMock } from '../utils/context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../utils/pieces.js'
import { stat } from 'fs/promises'
import { createReadStream, Stats, ReadStream } from 'fs'
import { savePieceAsset } from '@luzzle/core'
import { PassThrough } from 'stream'

vi.mock('../utils/pieces.js')
vi.mock('../../log.js')
vi.mock('fs/promises')
vi.mock('fs')
vi.mock('@luzzle/core')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	parseArgs: vi.mocked(parsePiecePathPositionalArgv),
	makeCommand: vi.mocked(makePiecePathPositional),
	stat: vi.mocked(stat),
	createReadStream: vi.mocked(createReadStream),
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
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats)
		mocks.createReadStream.mockReturnValueOnce(new PassThrough() as unknown as ReadStream)
		mocks.savePieceAsset.mockResolvedValueOnce('.assets/snippets/fibo/photo.png')

		const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg' } as Arguments<AttachArgv>)

		expect(mocks.savePieceAsset).toHaveBeenCalledWith(
			markdown.filePath,
			'photo.jpg',
			expect.any(PassThrough),
			ctx.storage
		)
		expect(consoleSpy).toHaveBeenCalledWith('.assets/snippets/fibo/photo.png')
		consoleSpy.mockRestore()
	})

	test('run handles missing local file error', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()

		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.stat.mockRejectedValueOnce(new Error('not found'))

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'missing.jpg' } as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledWith(expect.stringContaining('not found or is not a valid file'))
		expect(mocks.savePieceAsset).not.toHaveBeenCalled()
	})

	test('run handles savePieceAsset write error', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()

		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats)
		mocks.createReadStream.mockReturnValueOnce(new PassThrough() as unknown as ReadStream)
		mocks.savePieceAsset.mockRejectedValueOnce(new Error('disk full'))

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg' } as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledWith('failed to attach file: disk full')
	})

	test('run dry-run', async () => {
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		ctx.flags.dryRun = true

		mocks.parseArgs.mockResolvedValueOnce({ file: 'snippets/fibo.md', piece, markdown })
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as unknown as Stats)

		await command.run(ctx, { piece: 'snippets/fibo.md', file: 'photo.jpg' } as Arguments<AttachArgv>)

		expect(mocks.logInfo).toHaveBeenCalledWith(expect.stringContaining('[dry-run] would attach'))
		expect(mocks.savePieceAsset).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs()
		mocks.makeCommand.mockReturnValueOnce(args as unknown as Argv<AttachArgv>)

		command.builder?.(args)

		expect(mocks.makeCommand).toHaveBeenCalledOnce()
	})
})
