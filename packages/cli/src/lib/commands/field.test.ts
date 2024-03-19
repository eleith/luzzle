import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { AttachArgv } from './field.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv } from '../pieces/index.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'
import { PieceFrontmatterSchemaField } from '@luzzle/core'

vi.mock('../pieces/index')
vi.mock('../log.js')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	getPiece: vi.fn(),
	consoleLog: vi.spyOn(console, 'log'),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/field.ts', () => {
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
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const schema: PieceFrontmatterSchemaField = { name: 'title', type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<AttachArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run returns fieldname value', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const schema: PieceFrontmatterSchemaField = { name: fieldname, type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])

		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, fieldname } as Arguments<AttachArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run setfield', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const schema: PieceFrontmatterSchemaField = { name: fieldname, type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])
		spies.pieceSetField = vi
			.spyOn(PieceTest.prototype, 'setField')
			.mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, fieldname, value, set: true } as Arguments<AttachArgv>)

		expect(spies.pieceSetField).toHaveBeenCalledWith(pieceMarkdown, fieldname, value)
		expect(spies.pieceWrite).toHaveBeenCalledWith(pieceMarkdown)
	})

	test('run remove a field', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const schema: PieceFrontmatterSchemaField = { name: fieldname, type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])
		spies.pieceRemoveField = vi
			.spyOn(PieceTest.prototype, 'removeField')
			.mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, fieldname, remove: true } as Arguments<AttachArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalledWith(pieceMarkdown, fieldname)
		expect(spies.pieceWrite).toHaveBeenCalledWith(pieceMarkdown)
	})

	test('run fails to find slug', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const fieldname = 'title'
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(null)
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, fieldname } as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run fails to find fieldname', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const schema: PieceFrontmatterSchemaField = { name: 'title2', type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, { path, fieldname } as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows simultaneous setting and removing', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const schema: PieceFrontmatterSchemaField = { name: fieldname, type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, {
			path,
			fieldname,
			value,
			remove: true,
			set: true,
		} as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows setting without fieldname', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, {
			path,
			set: true,
		} as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows removing without fieldname', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, {
			path,
			remove: true,
		} as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run allows getting valid fieldnames', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, {
			path,
		} as Arguments<AttachArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
	})

	test('run disallows setting without a value', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const schema: PieceFrontmatterSchemaField = { name: fieldname, type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, {
			path,
			set: true,
			fieldname,
		} as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows removing with an extra value', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const schema: PieceFrontmatterSchemaField = { name: fieldname, type: 'string' }
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue([schema])
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ piece: 'books', slug: path })

		await command.run(ctx, {
			path,
			remove: true,
			value,
			fieldname,
		} as Arguments<AttachArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		mocks.piecesCommand.mockReturnValueOnce(args as Argv<AttachArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(2)
		expect(spies.option).toHaveBeenCalledTimes(2)
		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
	})
})
