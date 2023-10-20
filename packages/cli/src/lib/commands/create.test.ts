import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { CreateArgv } from './create.js'
import { Arguments } from 'yargs'
import { makeBookMarkDown } from '../../pieces/books/book.fixtures.js'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('ajv/dist/jtd')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/create', () => {
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
		const book = makeBookMarkDown()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(false)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
	})

	test('run errors on existing piece', async () => {
		const book = makeBookMarkDown()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceCreate).not.toHaveBeenCalledOnce()
		expect(spies.pieceWrite).not.toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run with dry-run', async () => {
		const book = makeBookMarkDown()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(false)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(spies.pieceCreate).not.toHaveBeenCalledOnce()
		expect(spies.pieceWrite).not.toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.positional = vi.spyOn(args, 'positional')
		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledOnce()
	})
})
