import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { FetchArgv } from './fetch.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv } from '../pieces/index.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'

vi.mock('../log')
vi.mock('../pieces/index')
vi.mock('ajv/dist/jtd')

const mocks = {
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/fetch', () => {
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
		const path = 'slug2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			config: { get: () => ({}) },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(book)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceFetch = vi.spyOn(PieceTest.prototype, 'fetch').mockResolvedValueOnce(book)

		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path, service: 'all' } as Arguments<FetchArgv>)

		expect(spies.pieceWrite).toHaveBeenCalledOnce()
		expect(spies.pieceFetch).toHaveBeenCalledOnce()
	})

	test('run with dry-run', async () => {
		const book = makeMarkdownSample()
		const path = 'slug2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			config: { get: () => ({}) },
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(book)
		spies.pieceFetch = vi.spyOn(PieceTest.prototype, 'fetch')

		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path } as Arguments<FetchArgv>)

		expect(spies.pieceGet).toHaveBeenCalledOnce()
		expect(spies.pieceFetch).not.toHaveBeenCalled()
	})

	test('run does not find slug', async () => {
		const path = 'slug2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(null)
		spies.pieceFetch = vi.spyOn(PieceTest.prototype, 'fetch')

		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path } as Arguments<FetchArgv>)

		expect(spies.pieceGet).toHaveBeenCalledOnce()
		expect(spies.pieceFetch).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs() as Argv<FetchArgv>

		spies.positional = vi.spyOn(args, 'positional')
		spies.option = vi.spyOn(args, 'option')

		mocks.piecesCommand.mockReturnValueOnce(args)

		command.builder?.(args)

		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
		expect(spies.option).toHaveBeenCalledWith('service', expect.any(Object))
	})
})
