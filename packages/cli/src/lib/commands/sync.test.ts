import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece } from '../pieces/piece.fixtures.js'
import { makeOptionalPieceCommand, parseOptionalPieceArgv } from '../pieces/index.js'
import { Pieces } from '@luzzle/kysely'

vi.mock('ajv/dist/jtd')
vi.mock('../pieces/index.js')

const mocks = {
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
	parseOptionalPieceArgv: vi.mocked(parseOptionalPieceArgv),
	makeOptionalPieceCommand: vi.mocked(makeOptionalPieceCommand),
}

const spies: { [key: string]: MockInstance } = {}

describe('lib/commands/sync', () => {
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
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})
		const slugs = ['a', 'b', 'c']
		const slugsUpdated = ['a', 'b']

		mocks.parseOptionalPieceArgv.mockReturnValue(null)
		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'getSlugsOutdated')
			.mockResolvedValue(slugsUpdated)

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(pieceType)
		expect(spies.pieceFilterSlugsBy).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledWith(slugsUpdated, false)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledOnce()
	})

	test('run with force', async () => {
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})
		const slugs = ['a', 'b']
		const slugsUpdated = ['a', 'b']

		mocks.parseOptionalPieceArgv.mockReturnValue(null)
		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'getSlugsOutdated')
			.mockResolvedValue(slugsUpdated)
		mocks.getPiece.mockResolvedValue(new PieceTest())

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledOnce()
		expect(spies.pieceFilterSlugsBy).toHaveBeenCalledOnce()
		expect(spies.pieceGetSlugs).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledWith(slugs, false)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledOnce()
	})

	test('run with one piece', async () => {
		const PieceTest = makePiece()
		const piece = 'piece' as Pieces
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})
		const slug = 'slug'

		mocks.parseOptionalPieceArgv.mockReturnValue({ piece, slug })
		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncCleanUp').mockResolvedValue()
		mocks.getPiece.mockResolvedValue(new PieceTest())

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledWith([slug], false)
		expect(spies.pieceSyncCleanUp).not.toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		mocks.makeOptionalPieceCommand.mockReturnValue(args)
		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledOnce()
		expect(mocks.makeOptionalPieceCommand).toHaveBeenCalledOnce()
	})
})
