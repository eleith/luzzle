import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { FieldArgv } from './field.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../pieces/index.js'
import { makeMarkdownSample, makePieceMock } from '../pieces/piece.fixtures.js'
import { PieceFrontmatterSchemaField } from '@luzzle/core'
import yaml from 'yaml'

vi.mock('../pieces/index')
vi.mock('../log.js')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	parseArgs: vi.mocked(parsePiecePathPositionalArgv),
	makePositional: vi.mocked(makePiecePathPositional),
	getPiece: vi.fn(),
	getTypes: vi.fn(),
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
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fields = [{ name: 'title', type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, { piece: file } as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run set field while dry run', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.validate = vi.spyOn(piece, 'validate').mockReturnValueOnce({ isValid: true })
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: `${fieldname}=${value}`,
			set: true,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(spies.pieceWrite).not.toHaveBeenCalledWith(markdown)
		expect(spies.validate).toHaveBeenCalledOnce()
		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('run set invalid field while dry run', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.validate = vi.spyOn(piece, 'validate').mockReturnValueOnce({ isValid: false, errors: [] })
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: `${fieldname}=${value}`,
			set: true,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(spies.pieceWrite).not.toHaveBeenCalledWith(markdown)
		expect(spies.validate).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run returns fieldname value', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })

		await command.run(ctx, {
			piece: file,
			fields: fieldname,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run field set', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: `${fieldname}=${value}`,
			set: true,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetFields).toHaveBeenCalledWith(markdown, { [fieldname]: value })
		expect(spies.pieceWrite).toHaveBeenCalledWith(markdown)
	})

	test('run field set with json input', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: JSON.stringify({ [fieldname]: value }),
			set: true,
			input: 'json',
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetFields).toHaveBeenCalledWith(markdown, { [fieldname]: value })
		expect(spies.pieceWrite).toHaveBeenCalledWith(markdown)
	})

	test('run field set with yaml input', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: yaml.stringify({ [fieldname]: value }),
			set: true,
			input: 'yaml',
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetFields).toHaveBeenCalledWith(markdown, { [fieldname]: value })
		expect(spies.pieceWrite).toHaveBeenCalledWith(markdown)
	})

	test('run remove a field', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const piece = new PieceTest()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceRemoveField = vi
			.spyOn(PieceTest.prototype, 'removeField')
			.mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: fieldname,
			remove: true,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalledWith(markdown, fieldname)
		expect(spies.pieceWrite).toHaveBeenCalledWith(markdown)
	})

	test('run fails to find fieldname', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: 'title2', type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: fieldname,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows simultaneous setting and removing', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'new title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			fields: `${fieldname}=${value}`,
			remove: true,
			set: true,
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run setting disallowed fields', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const markdown = makeMarkdownSample()
		const piece = new PieceTest()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			set: true,
			fields: 'title-bad',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run allows getting valid fieldnames', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
	})

	test('run disallows setting without a field', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			set: true,
			fields: '',
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run disallows removing without a field', async () => {
		const file = 'slug'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(PieceTest.prototype, 'fields', 'get').mockReturnValue(fields)
		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			remove: true,
			fields: '',
			input: 'simple',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		mocks.makePositional.mockReturnValueOnce(args as Argv<FieldArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(1)
		expect(spies.option).toHaveBeenCalledTimes(3)
		expect(mocks.makePositional).toHaveBeenCalledOnce()
	})
})
