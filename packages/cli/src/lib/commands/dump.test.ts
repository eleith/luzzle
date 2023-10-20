import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './dump.js'
import { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('ajv/dist/jtd')

const mocks = {
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/dump', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('dump', async () => {
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceDump = vi.spyOn(PieceTest.prototype, 'dump').mockResolvedValue()
		mocks.getPiece.mockReturnValue(new PieceTest())

		await command.run(ctx, {} as Arguments)

		expect(mocks.getPiece).toHaveBeenCalledOnce()
		expect(spies.pieceDump).toHaveBeenCalledOnce()
	})
})
