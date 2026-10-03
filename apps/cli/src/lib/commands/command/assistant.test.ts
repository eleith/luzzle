import log from '../../log.js'
import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach } from 'vitest'
import type { AssistantArgv } from './assistant.js';
import command from './assistant.js'
import type { Arguments, Argv } from 'yargs'
import yargs from 'yargs'
import { makeContext, makeMarkdownSample, makePieceMock } from '../utils/context.fixtures.js'
import { makePieceOption, parsePieceOptionArgv } from '../utils/pieces.js'
import yaml from 'yaml'
import { generatePieceFrontmatter } from '@luzzle/core'

vi.mock('@luzzle/core')
vi.mock('../utils/pieces.js')
vi.mock('../../log.js')
vi.mock('yaml')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	parseArgs: vi.mocked(parsePieceOptionArgv),
	makeOption: vi.mocked(makePieceOption),
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

	test.each([{ file: undefined }, { file: ['book.pdf', 'notes.txt'] }])('generates full metadata directly with files $file', async ({ file }) => {
		const apiKeys = 'api_key'
		const piece = makePieceMock()
		const frontmatter = makeMarkdownSample().frontmatter
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

		await command.run(ctx, { prompt, file } as Arguments<AssistantArgv>)

		expect(mocks.yamlStringify).toHaveBeenCalledOnce()
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
		expect(mocks.generatePieceFrontmatter).toHaveBeenCalledWith(
			apiKeys,
			{ schema: piece.schema, instructions: prompt },
			{ files: file }
		)
	})

	test('must use update and create exclusively', async () => {
		const update = 'path/to/piece'
		const directory = 'path/to/folder'
		const apiKeys = 'api_key'
		const piece = makePieceMock()
		const frontmatter = makeMarkdownSample().frontmatter
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

		await expect(creating).rejects.toThrow('update and directory are mutually exclusive')
		expect(mocks.parseArgs).not.toHaveBeenCalled()
		expect(mocks.generatePieceFrontmatter).not.toHaveBeenCalled()
		expect(mocks.yamlStringify).not.toHaveBeenCalled()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
	})

	test('must use update and title exclusively', async () => {
		const update = 'path/to/piece'
		const title = 'title'
		const apiKeys = 'api_key'
		const piece = makePieceMock()
		const frontmatter = makeMarkdownSample().frontmatter
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

		await expect(creating).rejects.toThrow('title is only to be used when creating a new piece')
		expect(mocks.parseArgs).not.toHaveBeenCalled()
		expect(mocks.generatePieceFrontmatter).not.toHaveBeenCalled()
		expect(mocks.yamlStringify).not.toHaveBeenCalled()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
	})

	test('updates a piece', async () => {
		const update = 'path/to/piece'
		const apiKeys = 'api_key'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const frontmatter = markdown.frontmatter
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		spies.pieceGet = vi.spyOn(piece, 'get').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		spies.pieceSetFields = vi
			.spyOn(piece, 'setFields')
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
		const piece = makePieceMock()
		const frontmatter = makeMarkdownSample().frontmatter
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

		await expect(creating).rejects.toThrow('title is required when creating a new piece')
		expect(mocks.parseArgs).not.toHaveBeenCalled()
		expect(mocks.generatePieceFrontmatter).not.toHaveBeenCalled()
		expect(mocks.yamlStringify).not.toHaveBeenCalled()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
	})

	test('creates a new piece', async () => {
		const directory = 'path/to/folder'
		const title = 'title'
		const apiKeys = 'api_key'
		const piece = makePieceMock()
		const markdown = makeMarkdownSample()
		const frontmatter = markdown.frontmatter
		const prompt = 'prompt'
		const ctx = makeContext({
			config: {
				get: vi.fn().mockReturnValueOnce(apiKeys),
			},
		})

		spies.pieceCreate = vi.spyOn(piece, 'create').mockResolvedValueOnce(markdown)
		spies.pieceWrite = vi.spyOn(piece, 'write').mockResolvedValueOnce()
		spies.pieceSetFields = vi
			.spyOn(piece, 'setFields')
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

	test('stays quiet until the validated result is ready', async () => {
		const piece = makePieceMock()
		const pending = Promise.withResolvers<Awaited<ReturnType<typeof generatePieceFrontmatter>>>()
		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockReturnValueOnce(pending.promise)
		const running = command.run(makeContext(), { prompt: 'Find details' } as Arguments<AssistantArgv>)
		await vi.waitFor(() => expect(mocks.generatePieceFrontmatter).toHaveBeenCalledOnce())
		expect(mocks.consoleLog).not.toHaveBeenCalled()
		expect(mocks.logInfo).not.toHaveBeenCalled()
		expect(mocks.yamlStringify).not.toHaveBeenCalled()
		pending.resolve({ title: 'Completed' })
		await running
		expect(mocks.yamlStringify).toHaveBeenCalledWith({ title: 'Completed' })
		expect(mocks.consoleLog).toHaveBeenCalledOnce()
	})

	test.each([
		{},
		{ update: 'existing.books.md' },
		{ directory: 'books', title: 'New book' },
	])('does not apply or print a failed generation: %j', async (options) => {
		const piece = makePieceMock()
		mocks.parseArgs.mockResolvedValueOnce({ piece })
		mocks.generatePieceFrontmatter.mockRejectedValueOnce(new Error('Invalid generated metadata'))
		await expect(command.run(makeContext(), { prompt: 'Find details', ...options } as Arguments<AssistantArgv>))
			.rejects.toThrow('Invalid generated metadata')
		expect(piece.get).not.toHaveBeenCalled()
		expect(piece.create).not.toHaveBeenCalled()
		expect(piece.setFields).not.toHaveBeenCalled()
		expect(piece.write).not.toHaveBeenCalled()
		expect(mocks.consoleLog).not.toHaveBeenCalled()
		expect(mocks.yamlStringify).not.toHaveBeenCalled()
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
