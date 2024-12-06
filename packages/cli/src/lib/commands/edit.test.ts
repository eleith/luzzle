import { ChildProcess, spawn } from 'child_process'
import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import { EventEmitter } from 'stream'
import command, { EditArgv } from './edit.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../pieces/index.js'
import { makeMarkdownSample, makePieceMock } from '../pieces/piece.fixtures.js'
import { existsSync } from 'fs'

vi.mock('child_process')
vi.mock('../pieces/index')
vi.mock('../log.js')
vi.mock('fs')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	parseArgs: vi.mocked(parsePiecePathPositionalArgv),
	makeCommand: vi.mocked(makePiecePathPositional),
	spawn: vi.mocked(spawn),
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
	existsSync: vi.mocked(existsSync),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/edit.js', () => {
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
		const file = `/home/user/file.md`
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()

		process.env.EDITOR = 'vi'

		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })
		mocks.existsSync.mockReturnValueOnce(true)

		await command.run(ctx, { piece: file } as Arguments<EditArgv>)

		expect(mocks.spawn).toHaveBeenCalledWith(process.env.EDITOR, [file], {
			cwd: ctx.directory,
			env: { ...process.env, LUZZLE: 'true' },
			stdio: 'inherit',
		})
	})

	test('run file not found', async () => {
		const file = `/home/user/file.md`
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()

		process.env.EDITOR = 'vi'

		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })
		mocks.existsSync.mockReturnValueOnce(false)

		await command.run(ctx, { piece: file } as Arguments<EditArgv>)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run dry-run', async () => {
		const file = `/home/user/file.md`
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			flags: { dryRun: true },
		})

		process.env.EDITOR = 'vi'

		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })
		mocks.existsSync.mockReturnValueOnce(true)

		await command.run(ctx, { piece: file } as Arguments<EditArgv>)

		expect(mocks.spawn).not.toHaveBeenCalled()
	})

	test('run with no editor', async () => {
		const file = `/home/user/file.md`
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const ctx = makeContext({
			flags: { dryRun: true },
		})

		delete process.env.EDITOR

		mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })
		mocks.existsSync.mockReturnValueOnce(true)

		await command.run(ctx, { piece: file } as Arguments<EditArgv>)

		expect(mocks.spawn).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		command.builder?.(args)

		expect(mocks.makeCommand).toHaveBeenCalledOnce()
	})
})
