import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { AttachArgv } from './attach.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv, downloadFileOrUrlTo } from '../pieces/index.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'
import { unlink } from 'fs/promises'
import log from '../log.js'

vi.mock('fs/promises')
vi.mock('../pieces/index')
vi.mock('../log')

const mocks = {
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
	download: vi.mocked(downloadFileOrUrlTo),
	unlink: vi.mocked(unlink),
	logError: vi.spyOn(log, 'error'),
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
		const tmpFile = 'tmpFile'
		const field = 'field'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })
		mocks.download.mockResolvedValueOnce(tmpFile)
		mocks.unlink.mockResolvedValueOnce(undefined)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValue(markdown)
		spies.pieceAttach = vi.spyOn(PieceTest.prototype, 'attach').mockResolvedValue(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write')

		await command.run(ctx, { path, file, field } as Arguments<AttachArgv>)

		expect(spies.pieceAttach).toHaveBeenCalledWith(tmpFile, markdown, field, undefined)
		expect(spies.pieceWrite).toHaveBeenCalledWith(markdown)
		expect(mocks.unlink).toHaveBeenCalledWith(tmpFile)
	})

	test('run catches error', async () => {
		const path = 'slug2'
		const file = 'file2'
		const tmpFile = 'tmpFile'
		const field = 'field'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })
		mocks.download.mockResolvedValueOnce(tmpFile)
		mocks.unlink.mockResolvedValueOnce(undefined)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValue(markdown)
		spies.pieceAttach = vi.spyOn(PieceTest.prototype, 'attach').mockRejectedValue(new Error('test'))

		await command.run(ctx, { path, file, field } as Arguments<AttachArgv>)

		expect(spies.pieceAttach).toHaveBeenCalledWith(tmpFile, markdown, field, undefined)
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run with dry-run', async () => {
		const path = 'slug2'
		const file = 'file2'
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValue(markdown)
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
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValue(null)
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
