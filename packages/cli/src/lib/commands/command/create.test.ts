import log from '../../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { CreateArgv } from './create.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makeMarkdownSample, makePieceMock, makeSchema, makeStorage } from '../../pieces/piece.fixtures.js'
import yaml from 'yaml'

vi.mock('fs')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	getPiece: vi.fn(),
	getTypes: vi.fn(),
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
		const title = 'title'
		const piece = 'books'
		const directory = 'dir'
		const storage = makeStorage('root')
		const PieceTest = makePieceMock()
		const schema = makeSchema(piece)
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest(piece, storage, schema)),
				getTypes: mocks.getTypes.mockReturnValue([piece]),
			},
		})

		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(markdown)
		spies.setFields = vi.spyOn(PieceTest.prototype, 'setFields').mockResolvedValueOnce(markdown)

		await command.run(ctx, { title, piece, directory } as Arguments<CreateArgv>)

		expect(spies.pieceWrite).toHaveBeenCalledOnce()
		expect(spies.pieceCreate).toHaveBeenCalledWith(directory, title)
		expect(spies.setFields).not.toHaveBeenCalled()
	})

	test('run and set fields with json', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const directory = 'dir'
		const PieceTest = makePieceMock()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
				getTypes: mocks.getTypes.mockReturnValue([piece]),
			},
		})
		const field = 'title'
		const value = 'value'

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceSetFields = vi.spyOn(PieceTest.prototype, 'setFields').mockResolvedValueOnce(book)

		await command.run(ctx, {
			title,
			piece,
			directory,
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
		const directory = '.'
		const PieceTest = makePieceMock()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
				getTypes: mocks.getTypes.mockReturnValue([piece]),
			},
		})
		const field = 'title'
		const value = 'value'

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceSetFields = vi.spyOn(PieceTest.prototype, 'setFields').mockResolvedValueOnce(book)

		await command.run(ctx, {
			title,
			piece,
			directory,
			input: 'yaml',
			fields: [yaml.stringify({ [field]: value })],
		} as Arguments<CreateArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(piece)
		expect(spies.pieceWrite).toHaveBeenCalledOnce()
		expect(spies.pieceSetFields).toHaveBeenCalledWith(book, { [field]: value })
	})

	test('run with dry-run', async () => {
		const book = makeMarkdownSample()
		const title = 'slug2'
		const piece = 'books'
		const directory = '.'
		const PieceTest = makePieceMock()
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
				getTypes: mocks.getTypes.mockReturnValue([piece]),
			},
		})

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()

		await command.run(ctx, { title, piece, directory } as Arguments<CreateArgv>)

		expect(spies.pieceCreate).toHaveBeenCalledOnce()
		expect(spies.pieceWrite).not.toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.positional = vi.spyOn(args, 'positional')
		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(2)
	})
})
