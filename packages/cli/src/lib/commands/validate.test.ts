import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { ValidateArgv } from './validate.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv, PieceMarkdownError } from '../pieces/index.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'
import { ValidateFunction } from 'ajv/dist/jtd.js'

vi.mock('../pieces/index')
vi.mock('../log.js')
vi.mock('ajv/dist/jtd')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	getPiece: vi.fn(),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/validate.ts', () => {
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
		const pieceMarkdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)
		spies.pieceGetPath = vi.spyOn(PieceTest.prototype, 'getPath').mockReturnValueOnce(fullPath)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<ValidateArgv>)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('run with an invalid piece', async () => {
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`
		const PieceTest = makePiece()
		const pieceError = new PieceMarkdownError('', [])
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})
		pieceError.validationErrors = [{ instancePath: '', message: '' }] as ValidateFunction['errors']

		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)
		spies.pieceGetPath = vi.spyOn(PieceTest.prototype, 'getPath').mockReturnValueOnce(fullPath)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockRejectedValueOnce(pieceError)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<ValidateArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run hits unknown error', async () => {
		const path = 'slug2'
		const fullPath = `/home/user/${path}.md`
		const PieceTest = makePiece()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceExists = vi.spyOn(PieceTest.prototype, 'exists').mockReturnValueOnce(true)
		spies.pieceGetPath = vi.spyOn(PieceTest.prototype, 'getPath').mockReturnValueOnce(fullPath)
		spies.pieceGet = vi
			.spyOn(PieceTest.prototype, 'get')
			.mockRejectedValueOnce(new Error('unknown error'))
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<ValidateArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		command.builder?.(args)

		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
	})
})
