import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { ProcessArgv } from './process.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { BookPiece } from '../books/index.js'

vi.mock('../books/index')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	BookPieceSlugs: vi.spyOn(BookPiece.prototype, 'getSlugs'),
	BookPieceSlugsUpdated: vi.spyOn(BookPiece.prototype, 'getSlugsUpdated'),
	BookPieceProcess: vi.spyOn(BookPiece.prototype, 'process'),
	BookPieceStale: vi.spyOn(BookPiece.prototype, 'removeStaleCache'),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/process', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('run', async () => {
		const ctx = makeContext()
		const slugs = ['slug3']

		mocks.BookPieceSlugsUpdated.mockResolvedValueOnce(slugs)
		mocks.BookPieceProcess.mockResolvedValueOnce()
		mocks.BookPieceStale.mockResolvedValueOnce(slugs)

		await command.run(ctx, {} as Arguments<ProcessArgv>)

		expect(mocks.BookPieceProcess).toHaveBeenCalledOnce()
		expect(mocks.BookPieceStale).toHaveBeenCalledOnce()
	})

	test('run with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const slugs = ['slug3']

		mocks.BookPieceSlugsUpdated.mockResolvedValueOnce(slugs)
		mocks.BookPieceProcess.mockResolvedValueOnce()
		mocks.BookPieceStale.mockResolvedValueOnce(slugs)

		await command.run(ctx, {} as Arguments<ProcessArgv>)

		expect(mocks.BookPieceProcess).not.toHaveBeenCalledOnce()
		expect(mocks.BookPieceStale).not.toHaveBeenCalledOnce()
	})

	test('run with force flag', async () => {
		const ctx = makeContext()
		const slugs = ['slug3', 'slug2']

		mocks.BookPieceSlugs.mockResolvedValueOnce(slugs)
		mocks.BookPieceProcess.mockResolvedValueOnce()
		mocks.BookPieceStale.mockResolvedValueOnce(slugs)

		await command.run(ctx, { force: true } as Arguments<ProcessArgv>)

		expect(mocks.BookPieceProcess).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.BookPieceStale).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledOnce()
	})
})
