import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { CreateArgv } from './create.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'

const mocks = {
	logError: vi.spyOn(log, 'error'),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: MockInstance } = {}

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
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(false)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
	})

	test('run and set fields', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})
		const field = 'title'
		const value = 'value'

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockReturnValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(false)
		spies.pieceSetFields = vi.spyOn(PieceTest.prototype, 'setFields').mockResolvedValueOnce(book)

		await command.run(ctx, { title, piece, fields: [`${field}=${value}`] } as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
		expect(spies.pieceSetFields).toHaveBeenCalledWith(book, { [field]: value })
	})

	test('run errors on existing piece', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
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
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
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

		expect(spies.positional).toHaveBeenCalledTimes(2)
	})
})
