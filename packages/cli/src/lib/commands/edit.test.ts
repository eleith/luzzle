import { ChildProcess, spawn } from 'child_process'
import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { EventEmitter } from 'stream'
import command, { EditArgv } from './edit.js'
import { Arguments } from 'yargs'
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
	logLevelSet: vi.spyOn(log, 'level', 'set'),
	piecesParseArgs: vi.spyOn(Pieces, 'parseArgv'),
	piecesCommand: vi.spyOn(Pieces, 'command'),
	BookPieceGetPath: vi.spyOn(BookPiece.prototype, 'getPath'),
	BookPieceExists: vi.spyOn(BookPiece.prototype, 'exists'),
	spawn: vi.mocked(spawn),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/edit', () => {
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
		const fullPath = `/home/user/${path}.md`

		process.env.EDITOR = 'vi'
		mocks.BookPieceGetPath.mockReturnValueOnce(fullPath)
		mocks.BookPieceExists.mockReturnValueOnce(true)
		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<EditArgv>)

		expect(mocks.spawn).toHaveBeenCalledWith(process.env.EDITOR, [fullPath], {
			cwd: ctx.directory,
			env: { ...process.env, LUZZLE: 'true' },
			stdio: 'inherit',
		})
	})

	test('run dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`

		process.env.EDITOR = 'vi'
		mocks.BookPieceGetPath.mockReturnValueOnce(fullPath)
		mocks.BookPieceExists.mockReturnValueOnce(true)
		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<EditArgv>)

		expect(mocks.spawn).not.toHaveBeenCalled()
	})

	test('run with non existant slug', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`

		process.env.EDITOR = 'vi'
		mocks.BookPieceGetPath.mockReturnValueOnce(fullPath)
		mocks.BookPieceExists.mockReturnValueOnce(false)
		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<EditArgv>)

		expect(mocks.spawn).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run with no editor', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`

		delete process.env.EDITOR

		mocks.BookPieceGetPath.mockReturnValueOnce(fullPath)
		mocks.BookPieceExists.mockReturnValueOnce(true)
		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<EditArgv>)

		expect(mocks.spawn).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		command.builder?.(args)

		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
	})
})
