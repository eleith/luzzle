import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { AssistantArgv } from './assistant.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../pieces/index.js'
import {
	makeFrontmatterSample,
	makeMarkdownSample,
	makePieceMock,
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
	parseArgs: vi.mocked(parsePiecePathPositionalArgv),
	makePositional: vi.mocked(makePiecePathPositional),
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
		const file = 'slug'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		mocks.parseArgs.mockResolvedValueOnce({ markdown, piece, file })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt } as Arguments<AssistantArgv>)

		expect(mocks.yamlStringify).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
		expect(mocks.generatePieceFrontmatter).toHaveBeenCalledWith(
			apiKeys,
			piece.schema,
			prompt,
			undefined
		)
	})

	test('strips empty output fields', async () => {
		const file = 'slug'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample({ oof: null, title: 'title' })
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)

		mocks.parseArgs.mockResolvedValueOnce({ markdown, piece, file })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt } as Arguments<AssistantArgv>)

		expect(mocks.yamlStringify).toHaveBeenCalledWith({ title: 'title' })
	})

	test('json output', async () => {
		const file = 'slug'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const attachment = 'file'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)

		mocks.parseArgs.mockResolvedValueOnce({ markdown, piece, file })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, file: attachment, output: 'json' } as Arguments<AssistantArgv>)

		expect(mocks.yamlStringify).not.toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
		expect(mocks.generatePieceFrontmatter).toHaveBeenCalledWith(
			apiKeys,
			piece.schema,
			prompt,
			attachment
		)
	})

	test('writes output to piece', async () => {
		const file = 'slug'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		spies.pieceGet = vi.spyOn(PieceTest.prototype, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)

		mocks.parseArgs.mockResolvedValueOnce({ markdown, piece, file })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, write: true } as Arguments<AssistantArgv>)

		expect(spies.pieceWrite).toHaveBeenCalledWith({ ...markdown, frontmatter })
		expect(spies.pieceSetFields).toHaveBeenCalledWith(markdown, frontmatter)
	})

	test('builder', async () => {
		const args = yargs()

		mocks.makePositional.mockReturnValueOnce(args as Argv<AssistantArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(0)
		expect(spies.option).toHaveBeenCalledTimes(4)
		expect(mocks.makePositional).toHaveBeenCalledOnce()
	})
})
