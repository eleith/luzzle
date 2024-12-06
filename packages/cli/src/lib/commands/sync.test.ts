import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceMock, makeRegisteredPiece } from '../pieces/piece.fixtures.js'
import { getPieces } from '@luzzle/core'

vi.mock('../pieces/index.js')
vi.mock('@luzzle/core')

const mocks = {
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
	findPieceNames: vi.fn(),
	getPieces: vi.mocked(getPieces),
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
		const files = ['a', 'b', 'c']
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const registeredPieces = [makeRegisteredPiece()]
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.findPieceNames.mockResolvedValueOnce([piece.type]),
				getFiles: mocks.getPieceTypes.mockResolvedValueOnce(files),
				getTypeFromFile: mocks.getPieceTypes.mockReturnValue(piece.type),
			},
		})

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncItems = vi.spyOn(PieceTest.prototype, 'syncItems').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncItemsCleanUp').mockResolvedValue()
		spies.pieceFilterSlugsBy = vi.spyOn(PieceTest.prototype, 'isOutdated')

		spies.pieceFilterSlugsBy.mockResolvedValueOnce(false)
		spies.pieceFilterSlugsBy.mockResolvedValueOnce(true)
		spies.pieceFilterSlugsBy.mockResolvedValueOnce(false)

		mocks.getPieces.mockResolvedValue(registeredPieces)

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(spies.pieceSync).toHaveBeenCalledWith(ctx.db, ctx.flags.dryRun)
		expect(spies.pieceSyncItems).toHaveBeenCalledWith(ctx.db, [files[1]], ctx.flags.dryRun)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledWith(ctx.db, files, ctx.flags.dryRun)
	})

	test('run with force', async () => {
		const files = ['a', 'b', 'c']
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const registeredPieces = [makeRegisteredPiece()]
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				getTypes: mocks.findPieceNames.mockResolvedValueOnce([piece.type]),
				getFiles: mocks.getPieceTypes.mockResolvedValueOnce(files),
				getTypeFromFile: mocks.getPieceTypes.mockReturnValue(piece.type),
			},
		})

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncItems = vi.spyOn(PieceTest.prototype, 'syncItems').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncItemsCleanUp').mockResolvedValue()
		spies.pieceFilterSlugsBy = vi.spyOn(PieceTest.prototype, 'isOutdated').mockResolvedValue(false)
		mocks.getPieces.mockResolvedValue(registeredPieces)

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(spies.pieceSync).toHaveBeenCalledWith(ctx.db, ctx.flags.dryRun)
		expect(spies.pieceSyncItems).toHaveBeenCalledWith(ctx.db, files, ctx.flags.dryRun)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledWith(ctx.db, files, ctx.flags.dryRun)
	})

	test('builder', async () => {
		const args = yargs()

		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledTimes(1)
	})
})
