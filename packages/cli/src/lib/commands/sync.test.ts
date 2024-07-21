import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece, makeRegisteredPiece } from '../pieces/piece.fixtures.js'
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

	test('run with one piece', async () => {
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const registeredPiece = makeRegisteredPiece()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValueOnce(new PieceTest()),
				findPieceNames: mocks.findPieceNames.mockResolvedValueOnce([pieceType]),
			},
		})
		const slugs = ['a', 'b', 'c']
		const slugsUpdated = ['a', 'b']

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncItems = vi.spyOn(PieceTest.prototype, 'syncItems').mockResolvedValueOnce()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncItemsCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'getSlugsOutdated')
			.mockResolvedValue(slugsUpdated)
		mocks.getPieces.mockResolvedValueOnce([registeredPiece])

		await command.run(ctx, { piece: pieceType } as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(pieceType)
		expect(spies.pieceFilterSlugsBy).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledWith(ctx.db, false)
		expect(spies.pieceSyncItems).toHaveBeenCalledWith(ctx.db, slugsUpdated, false)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledOnce()
	})

	test('run', async () => {
		const PieceTest = makePiece()
		const registeredPieces = [makeRegisteredPiece(), makeRegisteredPiece(), makeRegisteredPiece()]
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
				findPieceNames: mocks.findPieceNames.mockResolvedValueOnce(registeredPieces),
			},
		})
		const slugs = ['a', 'b', 'c']
		const slugsUpdated = ['a', 'b']

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncItems = vi.spyOn(PieceTest.prototype, 'syncItems').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncItemsCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'getSlugsOutdated')
			.mockResolvedValue(slugsUpdated)
		mocks.getPieces.mockResolvedValue(registeredPieces)

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledTimes(registeredPieces.length)
		expect(spies.pieceSync).toHaveBeenCalledTimes(registeredPieces.length)
		expect(spies.pieceSyncItems).toHaveBeenCalledTimes(registeredPieces.length)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledTimes(registeredPieces.length)
	})

	test('run with force', async () => {
		const PieceTest = makePiece()
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(new PieceTest()),
				findPieceNames: mocks.findPieceNames.mockResolvedValueOnce(['table']),
			},
		})
		const slugs = ['a', 'b']
		const slugsUpdated = ['a', 'b']
		const registeredPiece = makeRegisteredPiece()

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncItems = vi.spyOn(PieceTest.prototype, 'syncItems').mockResolvedValueOnce()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncItemsCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'getSlugsOutdated')
			.mockResolvedValue(slugsUpdated)
		mocks.getPiece.mockReturnValue(new PieceTest())
		mocks.getPieces.mockResolvedValueOnce([registeredPiece])

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledOnce()
		expect(spies.pieceFilterSlugsBy).toHaveBeenCalledOnce()
		expect(spies.pieceGetSlugs).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledWith(ctx.db, false)
		expect(spies.pieceSyncItems).toHaveBeenCalledWith(ctx.db, slugsUpdated, false)
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledTimes(2)
	})
})
