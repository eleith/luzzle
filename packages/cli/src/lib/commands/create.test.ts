import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { CreateArgv } from './create.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'
import yaml from 'yaml'

const mocks = {
	logError: vi.spyOn(log, 'error'),
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
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
	})

	test('run and set fields with json', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})
		const field = 'title'
		const value = 'value'

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockReturnValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(false)
		spies.pieceSetFields = vi.spyOn(PieceTest.prototype, 'setFields').mockResolvedValueOnce(book)

		await command.run(ctx, {
			title,
			piece,
			input: 'json',
			fields: [JSON.stringify({ [field]: value })],
		} as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
		expect(spies.pieceSetFields).toHaveBeenCalledWith(book, { [field]: value })
	})

	test('run and set fields with yaml', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})
		const field = 'title'
		const value = 'value'

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockReturnValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(false)
		spies.pieceSetFields = vi.spyOn(PieceTest.prototype, 'setFields').mockResolvedValueOnce(book)

		await command.run(ctx, {
			title,
			piece,
			input: 'yaml',
			fields: [yaml.stringify({ [field]: value })],
		} as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
		expect(spies.pieceSetFields).toHaveBeenCalledWith(book, { [field]: value })
	})

	test('run errors on existing piece', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const PieceTest = makePiece()
		const ctx = makeContext({
			pieces: {
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
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
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
