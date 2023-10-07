import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { AttachArgv } from './attach.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { Pieces } from '../pieces/index.js'
import { BookPiece } from '../../pieces/books/index.js'

vi.mock('child_process')
vi.mock('../books')
vi.mock('../pieces')
vi.mock('../../pieces/books/index')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	BookPieceExists: vi.spyOn(BookPiece.prototype, 'exists'),
	BookPieceAttach: vi.spyOn(BookPiece.prototype, 'attach'),
	piecesParseArgs: vi.spyOn(Pieces, 'parseArgv'),
	piecesCommand: vi.spyOn(Pieces, 'command'),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/attach', () => {
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
		const path = 'slug2'
		const file = 'file2'

		mocks.BookPieceExists.mockReturnValue(true)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, file } as Arguments<AttachArgv>)

		expect(mocks.BookPieceAttach).toHaveBeenCalledWith(path, file)
	})

	test('run with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const path = 'slug2'
		const file = 'file2'

		mocks.BookPieceExists.mockReturnValue(true)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, file } as Arguments<AttachArgv>)

		expect(mocks.BookPieceAttach).not.toHaveBeenCalled()
	})

	test('run does not find slug', async () => {
		const ctx = makeContext()
		const path = 'slug2'
		const file = 'file2'

		mocks.BookPieceExists.mockReturnValue(false)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, file } as Arguments<AttachArgv>)

		expect(mocks.BookPieceAttach).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs() as Argv<AttachArgv>

		spies.positional = vi.spyOn(args, 'positional')
		mocks.piecesCommand.mockReturnValueOnce(args)

		command.builder?.(args)

		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
		expect(spies.positional).toHaveBeenCalledWith('file', expect.any(Object))
	})
})
