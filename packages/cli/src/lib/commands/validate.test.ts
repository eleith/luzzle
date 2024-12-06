import log from '../log.js'
import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { ValidateArgv } from './validate.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiecePathPositional, parsePiecePathPositionalArgv } from '../pieces/index.js'
import { makeMarkdownSample, makePieceMock } from '../pieces/piece.fixtures.js'

vi.mock('../pieces/index')
vi.mock('../log.js')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	logInfo: vi.spyOn(log, 'info'),
	parseArgs: vi.mocked(parsePiecePathPositionalArgv),
	makeCommand: vi.mocked(makePiecePathPositional),
	getPiece: vi.fn(),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/validate.ts', () => {
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

		spies.validate = vi
			.spyOn(PieceTest.prototype, 'validate')
			.mockReturnValueOnce({ isValid: true })
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })

		await command.run(ctx, { piece: file } as Arguments<ValidateArgv>)

		expect(mocks.logError).not.toHaveBeenCalled()
	})

	test('run on invalid piece', async () => {
		const file = `/home/user/file.md`
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const markdown = makeMarkdownSample()
		const ctx = makeContext()
		const errors = ['error1', 'error2']

		spies.validate = vi
			.spyOn(PieceTest.prototype, 'validate')
			.mockReturnValueOnce({ isValid: false, errors })
		mocks.parseArgs.mockResolvedValueOnce({ file, markdown, piece })

		await command.run(ctx, { piece: file } as Arguments<ValidateArgv>)

		expect(spies.validate).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs()

		command.builder?.(args)

		expect(mocks.makeCommand).toHaveBeenCalledOnce()
	})
})
