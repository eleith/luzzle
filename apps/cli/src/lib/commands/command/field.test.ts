import log from '../../../lib/log.js'
import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach } from 'vitest'
import type { FieldArgv } from './field.js';
import command from './field.js'
import type { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import yaml from 'yaml'
import { makeContext, makeMarkdownSample, makePieceMock } from '../utils/context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../utils/pieces.js'
import type { PieceFrontmatterSchemaField } from '@luzzle/core'

vi.mock('../utils/pieces.js')
vi.mock('../../../lib/log.js')

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
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, { piece: file } as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test('run set field while dry run', async () => {
		const file = 'slug'
		const piece = makePieceMock()
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
		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetField = vi.spyOn(piece, 'setField').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		spies.pieceGetField = vi.spyOn(piece, 'getField')

		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value,
		} as Arguments<FieldArgv>)

		expect(spies.pieceWrite).not.toHaveBeenCalledWith(markdown)
		expect(spies.validate).toHaveBeenCalledOnce()
	})

	test('run set invalid field while dry run', async () => {
		const file = 'slug'
		const piece = makePieceMock()
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
		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetField = vi.spyOn(piece, 'setField').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value,
		} as Arguments<FieldArgv>)

		expect(spies.pieceWrite).not.toHaveBeenCalledWith(markdown)
		expect(spies.validate).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run returns fieldname value', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample({ frontmatter: { title: 'value' } })
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledWith('value')
	})

	test('run field set', async () => {
		const file = 'slug'
		const piece = makePieceMock()
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

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetField = vi
			.spyOn(piece, 'setField')
			.mockResolvedValueOnce({ ...markdown, frontmatter: { title: value } })
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value,
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetField).toHaveBeenCalledWith(markdown, fieldname, value)
		expect(spies.pieceWrite).toHaveBeenCalled()
	})

	test('run field set on an array', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const fieldname = 'tags'
		const value = 'one'
		const fields = [
			{ name: fieldname, type: 'array', items: { type: 'string' } },
		] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetField = vi
			.spyOn(piece, 'setField')
			.mockResolvedValueOnce({ ...markdown, frontmatter: { tags: [value] } })
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value,
		} as Arguments<FieldArgv>)

		expect(spies.pieceSetField).toHaveBeenCalledWith(markdown, fieldname, value)
		expect(spies.pieceWrite).toHaveBeenCalled()
	})

	test('run remove a field', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceRemoveField = vi.spyOn(piece, 'removeField').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			remove: true,
		} as Arguments<FieldArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalledWith(markdown, fieldname, undefined)
		expect(spies.pieceWrite).toHaveBeenCalled()
	})

	test('run remove a field by value', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const value = 'nope'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceRemoveField = vi.spyOn(piece, 'removeField').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value,
			remove: true,
		} as Arguments<FieldArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalledWith(markdown, fieldname, value)
		expect(spies.pieceWrite).toHaveBeenCalled()
	})

	test('run remove a field with dry run', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.validate = vi.spyOn(piece, 'validate').mockReturnValueOnce({ isValid: true })

		spies.pieceRemoveField = vi.spyOn(piece, 'removeField').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			remove: true,
		} as Arguments<FieldArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalled()
		expect(spies.pieceWrite).not.toHaveBeenCalled()
	})

	test('run remove a field invalid with dry run', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const fields = [{ name: fieldname, type: 'string' }] as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.validate = vi.spyOn(piece, 'validate').mockReturnValueOnce({ isValid: false, errors: [] })

		spies.pieceRemoveField = vi.spyOn(piece, 'removeField').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			remove: true,
		} as Arguments<FieldArgv>)

		expect(spies.pieceRemoveField).toHaveBeenCalled()
		expect(spies.pieceWrite).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalled()
	})

	test('run fails to find fieldname', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const fieldname = 'title'
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue([])
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run setting disallowed fields', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue([])
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: 'title-bad',
			value: 'asf',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run set nested field', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample({ frontmatter: { meta: { author: 'Old' } } })
		const fieldname = 'meta.author'
		const value = 'New Author'
		const fields = [
			{ name: 'meta', type: 'object', properties: { author: { type: 'string' } } },
		] as unknown as Array<PieceFrontmatterSchemaField>
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetField = vi
			.spyOn(piece, 'setField')
			.mockResolvedValueOnce({ ...markdown, frontmatter: { meta: { author: value } } })
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalled()
		expect(spies.pieceSetField).toHaveBeenCalledWith(markdown, fieldname, value)
	})

	test('run returns object value', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const metadata = { author: 'Bob' }
		const markdown = makeMarkdownSample({ frontmatter: { meta: metadata } })
		const fieldname = 'meta'
		const fields = [
			{ name: fieldname, type: 'object', properties: { author: { type: 'string' } } },
		] as unknown as PieceFrontmatterSchemaField[]
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalled()
		expect(mocks.consoleLog).toHaveBeenCalledWith(yaml.stringify(metadata))
	})

	test('run set object value while dry run', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const metadata = { author: 'Bob' }
		const markdown = makeMarkdownSample()
		const fieldname = 'meta'
		const fields = [
			{ name: fieldname, type: 'object', properties: { author: { type: 'string' } } },
		] as unknown as PieceFrontmatterSchemaField[]
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.validate = vi.spyOn(piece, 'validate').mockReturnValueOnce({ isValid: true })
		spies.pieceFields = vi.spyOn(piece, 'fields', 'get').mockReturnValue(fields)
		spies.pieceSetField = vi
			.spyOn(piece, 'setField')
			.mockResolvedValueOnce({ ...markdown, frontmatter: { meta: metadata } })
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			field: fieldname,
			value: 'ignored-in-mock',
		} as Arguments<FieldArgv>)

		expect(mocks.consoleLog).toHaveBeenCalledWith(yaml.stringify(metadata))
	})

	test('run allows getting valid fieldnames', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
			},
		})

		spies.pieceGet = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
		} as Arguments<FieldArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
	})

	test('run disallows removing without a field', async () => {
		const file = 'slug'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.getTypes.mockReturnValue([piece.type]),
			},
		})

		spies.pieceGet = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		mocks.parseArgs.mockResolvedValueOnce({ file, piece, markdown })

		await command.run(ctx, {
			piece: file,
			remove: true,
			field: '',
		} as Arguments<FieldArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		mocks.makePositional.mockReturnValueOnce(args as Argv<FieldArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(2)
		expect(spies.option).toHaveBeenCalledTimes(1)
		expect(mocks.makePositional).toHaveBeenCalledOnce()
	})
})
