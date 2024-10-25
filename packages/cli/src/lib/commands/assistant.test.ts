import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { AssistantArgv } from './assistant.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceCommand, parsePieceArgv } from '../pieces/index.js'
import {
	makeFrontmatterSample,
	makeMarkdownSample,
	makePiece,
	makeSchema,
} from '../pieces/piece.fixtures.js'
import yaml from 'yaml'
import { generatePieceFrontmatter } from '../llm/google.js'

vi.mock('../pieces/index')
vi.mock('../log.js')
vi.mock('../llm/google.js')
vi.mock('yaml')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	piecesParseArgs: vi.mocked(parsePieceArgv),
	piecesCommand: vi.mocked(makePieceCommand),
	generatePieceFrontmatter: vi.mocked(generatePieceFrontmatter),
	getPiece: vi.fn(),
	consoleLog: vi.spyOn(console, 'log'),
	yamlStringify: vi.mocked(yaml.stringify),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/assistant.ts', () => {
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
		const apiKeys = 'api_key'
		const pieceType = 'books'
		const PieceTest = makePiece()
		const schema = makeSchema(pieceType)
		const pieceMarkdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const file = 'file'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest({ name: pieceType })),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, file } as Arguments<AssistantArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.yamlStringify).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
		expect(mocks.generatePieceFrontmatter).toHaveBeenCalledWith(apiKeys, schema, prompt, file)
	})

	test('strips empty output fields', async () => {
		const path = 'slug'
		const apiKeys = 'api_key'
		const pieceType = 'books'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample({ oof: null, title: 'title' })
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest({ name: pieceType })),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt } as Arguments<AssistantArgv>)

		expect(mocks.yamlStringify).toHaveBeenCalledWith({ title: 'title' })
	})

	test('json output', async () => {
		const path = 'slug'
		const apiKeys = 'api_key'
		const pieceType = 'books'
		const PieceTest = makePiece()
		const schema = makeSchema(pieceType)
		const pieceMarkdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const file = 'file'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest({ name: pieceType })),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, file, output: 'json' } as Arguments<AssistantArgv>)

		expect(mocks.logError).not.toHaveBeenCalledOnce()
		expect(mocks.yamlStringify).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
		expect(mocks.generatePieceFrontmatter).toHaveBeenCalledWith(apiKeys, schema, prompt, file)
	})

	test('writes output to piece', async () => {
		const path = 'slug'
		const apiKeys = 'api_key'
		const pieceType = 'books'
		const PieceTest = makePiece()
		const pieceMarkdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest({ name: pieceType })),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(pieceMarkdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, write: true } as Arguments<AssistantArgv>)

		expect(spies.pieceWrite).toHaveBeenCalledOnce()
	})

	test('run fails to find piece', async () => {
		const path = 'slug'
		const apiKeys = 'api_key'
		const pieceType = 'books'
		const PieceTest = makePiece()
		const prompt = 'prompt'
		const file = 'file'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest({ name: pieceType })),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(null)

		mocks.piecesParseArgs.mockResolvedValueOnce({ name: 'books', slug: path })

		await command.run(ctx, { prompt, file } as Arguments<AssistantArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).not.toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		mocks.piecesCommand.mockReturnValueOnce(args as Argv<AssistantArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(0)
		expect(spies.option).toHaveBeenCalledTimes(4)
		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
	})
})
