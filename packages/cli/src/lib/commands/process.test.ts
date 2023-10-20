import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { ProcessArgv } from './process.js'
import { Arguments } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePiece } from '../pieces/piece.fixtures.js'

vi.mock('ajv/dist/jtd')

const mocks = {
	getPieceTypes: vi.fn(),
	getPiece: vi.fn(),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/process', () => {
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
		const slugs = ['slug1', 'slug2', 'slug3']
		const slugsUpdated = ['slug3']
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceProcess = vi.spyOn(PieceTest.prototype, 'process').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugs = vi
			.spyOn(PieceTest.prototype, 'filterSlugsBy')
			.mockResolvedValue(slugsUpdated)

		await command.run(ctx, {} as Arguments<ProcessArgv>)

		expect(spies.pieceProcess).toHaveBeenCalledOnce()
		expect(spies.pieceFilterSlugs).toHaveBeenCalledOnce()
	})

	test('run with force flag', async () => {
		const slugs = ['slug1', 'slug2', 'slug3']
		const slugsUpdated = ['slug3']
		const PieceTest = makePiece()
		const pieceType = 'piece'
		const ctx = makeContext({
			pieces: {
				getPieceTypes: mocks.getPieceTypes.mockReturnValue([pieceType]),
				getPiece: mocks.getPiece.mockResolvedValue(new PieceTest()),
			},
		})

		spies.pieceProcess = vi.spyOn(PieceTest.prototype, 'process').mockResolvedValue()
		spies.pieceGetSlugs = vi.spyOn(PieceTest.prototype, 'getSlugs').mockResolvedValue(slugs)
		spies.pieceFilterSlugs = vi
			.spyOn(PieceTest.prototype, 'filterSlugsBy')
			.mockResolvedValue(slugsUpdated)

		await command.run(ctx, { force: true } as Arguments<ProcessArgv>)

		expect(spies.pieceProcess).toHaveBeenCalledOnce()
		expect(spies.pieceFilterSlugs).not.toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledOnce()
	})
})
