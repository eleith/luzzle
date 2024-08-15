import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { FieldArgv } from './field.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv } from '../pieces/index.js'
import { makeMarkdownSample, makePiece } from '../pieces/piece.fixtures.js'
import { PieceFrontmatterSchemaField } from '@luzzle/core'
import yaml from 'yaml'

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
		const fields = [{ name: 'title', type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, { path } as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run returns fieldname value', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, { path, fields: [fieldname], input: 'csv' } as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run field set', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			fields: [`${fieldname}=${value}`],
			set: true,
			input: 'csv',
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetFields).toHaveBeenCalledWith(pieceMarkdown, { [fieldname]: value })
		expect(spies.pieceWrite).toHaveBeenCalledWith(pieceMarkdown)
	})

	test('run field set with json input', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			fields: [JSON.stringify({ [fieldname]: value })],
			set: true,
			input: 'json',
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetFields).toHaveBeenCalledWith(pieceMarkdown, { [fieldname]: value })
		expect(spies.pieceWrite).toHaveBeenCalledWith(pieceMarkdown)
	})

	test('run field set with yaml input', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			fields: [yaml.stringify({ [fieldname]: value })],
			set: true,
			input: 'yaml',
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetFields).toHaveBeenCalledWith(pieceMarkdown, { [fieldname]: value })
		expect(spies.pieceWrite).toHaveBeenCalledWith(pieceMarkdown)
	})

	test('run field set skips write on catch', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockRejectedValueOnce(new Error('error'))
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()

		await command.run(ctx, {
			path,
			fields: [`${fieldname}=${value}`],
			set: true,
			input: 'csv',
		} as Arguments<FieldArgv>)

		expect(spies.pieceWrite).not.toHaveBeenCalled()
	})

	test('run remove a field', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceRemoveField = vi
			.spyOn(PieceTest.prototype, 'removeField')
			.mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			fields: [fieldname],
			remove: true,
			input: 'csv',
		} as Arguments<FieldArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalledWith(pieceMarkdown, fieldname)
		expect(spies.pieceWrite).toHaveBeenCalledWith(pieceMarkdown)
	})

	test('run remove a field skips write on catch', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceRemoveField = vi
			.spyOn(PieceTest.prototype, 'removeField')
			.mockRejectedValueOnce(new Error('error'))
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			fields: [fieldname],
			remove: true,
			input: 'csv',
		} as Arguments<FieldArgv>)

		expect(spies.pieceWrite).toHaveBeenCalledTimes(0)
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
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, { path, fields: [fieldname], input: 'csv' } as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run fails to find fieldname', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: 'title2', type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, { path, fields: [fieldname], input: 'csv' } as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows simultaneous setting and removing', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			fields: [`${fieldname}=${value}`],
			remove: true,
			set: true,
			input: 'csv',
		} as Arguments<FieldArgv>)

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
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			set: true,
		} as Arguments<FieldArgv>)

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
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			remove: true,
		} as Arguments<FieldArgv>)

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
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
	})

	test('run disallows setting without a value', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			set: true,
			fields: [fieldname],
			input: 'csv',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows removing with an extra value', async () => {
		const path = 'slug'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, {
			path,
			remove: true,
			fields: [`${fieldname}=${value}`],
			input: 'csv',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		mocks.piecesCommand.mockReturnValueOnce(args as Argv<FieldArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(1)
		expect(spies.option).toHaveBeenCalledTimes(3)
		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
	})
})
