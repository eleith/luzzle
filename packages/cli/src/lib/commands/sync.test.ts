import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('ajv/dist/jtd')

const mocks = {
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: SpyInstance } = {}

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

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'filterSlugsBy')
			.mockResolvedValue(slugsUpdated)

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledWith(pieceType)
		expect(spies.pieceFilterSlugsBy).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledOnce()
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

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.pieceSyncCleanUp = vi.spyOn(PieceTest.prototype, 'syncCleanUp').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugsBy = vi
			.spyOn(PieceTest.prototype, 'filterSlugsBy')
			.mockResolvedValue(slugsUpdated)
		mocks.getPiece.mockResolvedValue(new PieceTest())

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(mocks.getPiece).toHaveBeenCalledOnce()
		expect(spies.pieceFilterSlugsBy).not.toHaveBeenCalledOnce()
		expect(spies.pieceGetSlugs).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledOnce()
		expect(spies.pieceSyncCleanUp).toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledOnce()
	})
})
