import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { AttachArgv } from './attach.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv } from '../pieces/index.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('../pieces/index')
vi.mock('../log')
vi.mock('ajv/dist/jtd')

const mocks = {
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
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
		const path = 'slug2'
		const file = 'file2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValue(true)
		spies.pieceAttach = vi.spyOn(PieceTest.prototype, 'attach')

		await command.run(ctx, { path, file } as Arguments<AttachArgv>)

		expect(spies.pieceAttach).toHaveBeenCalledWith(path, file)
	})

	test('run with dry-run', async () => {
		const path = 'slug2'
		const file = 'file2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValue(true)
		spies.pieceAttach = vi.spyOn(PieceTest.prototype, 'attach')

		await command.run(ctx, { path, file } as Arguments<AttachArgv>)

		expect(spies.pieceAttach).not.toHaveBeenCalled()
	})

	test('run does not find slug', async () => {
		const path = 'slug2'
		const file = 'file2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValue(false)
		spies.pieceAttach = vi.spyOn(PieceTest.prototype, 'attach')

		await command.run(ctx, { path, file } as Arguments<AttachArgv>)

		expect(spies.pieceAttach).not.toHaveBeenCalled()
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
