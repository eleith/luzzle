import log from '../../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { AssistantArgv } from './assistant.js'
import { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceOption, parsePieceOptionArgv } from '../../pieces/index.js'
import {
	makeFrontmatterSample,
	makeMarkdownSample,
	makePieceMock,
} from '../../pieces/piece.fixtures.js'
import yaml from 'yaml'
import { pieceFrontMatterFromPrompt } from '../../llm/google.js'

vi.mock('../../pieces/index')
vi.mock('../../log.js')
vi.mock('../../llm/google.js')
vi.mock('yaml')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	parseArgs: vi.mocked(parsePieceOptionArgv),
	makeOption: vi.mocked(makePieceOption),
	generatePieceFrontmatter: vi.mocked(pieceFrontMatterFromPrompt),
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
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		mocks.parseArgs.mockResolvedValueOnce({ piece })
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

	test('must use update and create exclusively', async () => {
		const update = 'path/to/piece'
		const directory = 'path/to/folder'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		const creating = command.run(ctx, { prompt, update, directory } as Arguments<AssistantArgv>)

		await expect(creating).rejects.toThrow()
	})

	test('must use update and title exclusively', async () => {
		const update = 'path/to/piece'
		const title = 'title'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		const creating = command.run(ctx, { prompt, update, title } as Arguments<AssistantArgv>)

		await expect(creating).rejects.toThrow()
	})

	test('updates a piece', async () => {
		const update = 'path/to/piece'
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

		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, update } as Arguments<AssistantArgv>)

		expect(spies.pieceGet).toHaveBeenCalledWith(update)
		expect(spies.pieceWrite).toHaveBeenCalledWith({ ...markdown, frontmatter })
		expect(spies.pieceSetFields).toHaveBeenCalledWith(markdown, frontmatter)
	})

	test('must have a title when creating', async () => {
		const directory = 'path/to/folder'
		const apiKeys = 'api_key'
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const frontmatter = makeFrontmatterSample()
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		const creating = command.run(ctx, { prompt, directory } as Arguments<AssistantArgv>)

		await expect(creating).rejects.toThrow()
	})

	test('creates a new piece', async () => {
		const directory = 'path/to/folder'
		const title = 'title'
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

		spies.pieceCreate = vi.spyOn(PieceTest.prototype, 'create').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(PieceTest.prototype, 'write').mockResolvedValueOnce()
		spies.pieceSetFields = vi
			.spyOn(PieceTest.prototype, 'setFields')
			.mockResolvedValueOnce(markdown)

		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockResolvedValueOnce(
			frontmatter as unknown as Record<string, string | number | boolean>
		)

		await command.run(ctx, { prompt, directory, title } as Arguments<AssistantArgv>)

		expect(spies.pieceCreate).toHaveBeenCalledWith(directory, title)
		expect(spies.pieceWrite).toHaveBeenCalledWith({ ...markdown, frontmatter })
		expect(spies.pieceSetFields).toHaveBeenCalledWith(markdown, frontmatter)
	})

	test('builder', async () => {
		const args = yargs()

		mocks.makeOption.mockReturnValueOnce(args as Argv<AssistantArgv>)
		spies.positional = vi.spyOn(args, 'positional').mockReturnValue(args)
		spies.option = vi.spyOn(args, 'option').mockReturnValue(args)

		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledTimes(0)
		expect(spies.option).toHaveBeenCalledTimes(5)
		expect(mocks.makeOption).toHaveBeenCalledOnce()
	})
})
