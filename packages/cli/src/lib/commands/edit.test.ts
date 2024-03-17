import { ChildProcess, spawn } from 'child_process'
import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { EventEmitter } from 'stream'
import command, { EditArgv } from './edit.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv } from '../pieces/index.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('child_process')
vi.mock('../pieces/index')
vi.mock('../log.js')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	spawn: vi.mocked(spawn),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/edit.js', () => {
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
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		process.env.EDITOR = 'vi'

		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)
		spies.pieceGetPath = vi.spyOn(PieceTest.prototype, 'getPath').mockReturnValueOnce(fullPath)
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
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		process.env.EDITOR = 'vi'
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)
		spies.pieceGetPath = vi.spyOn(PieceTest.prototype, 'getPath').mockReturnValueOnce(fullPath)

		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<EditArgv>)

		expect(mocks.spawn).not.toHaveBeenCalled()
	})

	test('run with no editor', async () => {
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		delete process.env.EDITOR
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)
		spies.pieceGetPath = vi.spyOn(PieceTest.prototype, 'getPath').mockReturnValueOnce(fullPath)

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
