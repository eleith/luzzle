import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command from './dump.js'
import { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('@luzzle/core')

const mocks = {
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
	findPieceNames: vi.fn(),
}

const spies: { [key: string]: MockInstance } = {}

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
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
				findPieceNames: mocks.findPieceNames.mockResolvedValue(['test']),
			},
		})

		spies.pieceDump = vi.spyOn(PieceTest.prototype, 'dump').mockResolvedValue()

		await command.run(ctx, {} as Arguments)

		expect(mocks.getPiece).toHaveBeenCalledOnce()
		expect(mocks.findPieceNames).toHaveBeenCalledOnce()
		expect(spies.pieceDump).toHaveBeenCalledOnce()
	})
})
