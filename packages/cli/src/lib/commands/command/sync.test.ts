import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'
import { makePieceMock } from '../../pieces/piece.fixtures.js'
import { getPieces, selectItemAssets } from '@luzzle/core'

vi.mock('../../pieces/index.js')
vi.mock('@luzzle/core')
vi.mock('fs/promises')
vi.mock('path')

const mocks = {
	sync: vi.fn(),
	prune: vi.fn(),
	getFiles: vi.fn(),
	getPiece: vi.fn(),
	findPieceNames: vi.fn(),
	getPieces: vi.mocked(getPieces),
	selectItemAssets: vi.mocked(selectItemAssets),
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
		const type = piece.type
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				sync: mocks.sync.mockResolvedValueOnce([piece.type]),
				parseFilename: vi.fn().mockReturnValue({ type }),
				getFilesIn: mocks.getFiles.mockResolvedValueOnce({
					pieces: files,
					assets: [],
					types: [type],
				}),
				prune: mocks.prune.mockResolvedValue(null),
			},
		})

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.piecePrune = vi.spyOn(PieceTest.prototype, 'prune').mockResolvedValue()
		spies.pieceIsOutdated = vi.spyOn(PieceTest.prototype, 'isOutdated')

		spies.pieceIsOutdated.mockResolvedValueOnce(false)
		spies.pieceIsOutdated.mockResolvedValueOnce(true)
		spies.pieceIsOutdated.mockResolvedValueOnce(false)

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.sync).toHaveBeenCalledOnce()
		expect(mocks.prune).toHaveBeenCalledOnce()
		expect(mocks.selectItemAssets).not.toHaveBeenCalled()
		expect(spies.pieceSync).toHaveBeenCalledWith(ctx.db, [files[1]], ctx.flags.dryRun)
		expect(spies.piecePrune).toHaveBeenCalledWith(ctx.db, files, ctx.flags.dryRun)
		expect(spies.pieceIsOutdated).toHaveBeenCalledTimes(files.length)
	})

	test('run with force', async () => {
		const files = ['a', 'b', 'c']
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const type = piece.type
		const ctx = makeContext({
			pieces: {
				sync: mocks.sync.mockResolvedValueOnce([piece.type]),
				getPiece: mocks.getPiece.mockReturnValue(piece),
				parseFilename: vi.fn().mockReturnValue({ type }),
				getFilesIn: mocks.getFiles.mockResolvedValueOnce({
					pieces: files,
					assets: [],
					types: [type],
				}),
				prune: mocks.prune.mockResolvedValue(null),
			},
		})

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.piecePrune = vi.spyOn(PieceTest.prototype, 'prune').mockResolvedValue()
		spies.pieceIsOutdated = vi.spyOn(PieceTest.prototype, 'isOutdated').mockResolvedValue(false)

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(mocks.sync).toHaveBeenCalledOnce()
		expect(mocks.prune).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledWith(ctx.db, files, ctx.flags.dryRun)
		expect(spies.piecePrune).toHaveBeenCalledWith(ctx.db, files, ctx.flags.dryRun)
		expect(mocks.selectItemAssets).not.toHaveBeenCalled()
	})

	test('run with prune', async () => {
		const files: string[] = []
		const dbAssets = ['a', 'b', 'c']
		const diskAssets = [...dbAssets, 'd', 'e']
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const type = piece.type
		const ctx = makeContext({
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				sync: mocks.sync.mockResolvedValueOnce([piece.type]),
				parseFilename: vi.fn().mockReturnValue({ type }),
				getFilesIn: mocks.getFiles.mockResolvedValueOnce({
					pieces: files,
					assets: diskAssets,
					types: [type],
				}),
				prune: mocks.prune.mockResolvedValue(null),
			},
		})

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.piecePrune = vi.spyOn(PieceTest.prototype, 'prune').mockResolvedValue()
		spies.pieceIsOutdated = vi.spyOn(PieceTest.prototype, 'isOutdated')
		spies.delete = vi.spyOn(ctx.storage, 'delete')

		mocks.selectItemAssets.mockResolvedValueOnce(dbAssets)
		spies.pieceIsOutdated.mockResolvedValueOnce(false)
		spies.delete.mockResolvedValue(undefined)

		await command.run(ctx, { prune: true } as Arguments<SyncArgv>)

		expect(mocks.selectItemAssets).toHaveBeenCalled()
		expect(spies.delete).toHaveBeenCalledTimes(2)
	})

	test('run with prune and dry-run', async () => {
		const files: string[] = []
		const dbAssets = ['a', 'b', 'c']
		const diskAssets = [...dbAssets, 'd', 'e']
		const PieceTest = makePieceMock()
		const piece = new PieceTest()
		const type = piece.type
		const ctx = makeContext({
			flags: { dryRun: true },
			pieces: {
				getPiece: mocks.getPiece.mockReturnValue(piece),
				sync: mocks.sync.mockResolvedValueOnce([piece.type]),
				parseFilename: vi.fn().mockReturnValue({ type }),
				getFilesIn: mocks.getFiles.mockResolvedValueOnce({
					pieces: files,
					assets: diskAssets,
					types: [type],
				}),
				prune: mocks.prune.mockResolvedValue(null),
			},
		})

		spies.pieceSync = vi.spyOn(PieceTest.prototype, 'sync').mockResolvedValue()
		spies.piecePrune = vi.spyOn(PieceTest.prototype, 'prune').mockResolvedValue()
		spies.pieceIsOutdated = vi.spyOn(PieceTest.prototype, 'isOutdated')
		spies.delete = vi.spyOn(ctx.storage, 'delete')

		mocks.selectItemAssets.mockResolvedValueOnce(dbAssets)
		spies.pieceIsOutdated.mockResolvedValueOnce(false)
		spies.delete.mockReturnValue(undefined)

		await command.run(ctx, { prune: true } as Arguments<SyncArgv>)

		expect(mocks.selectItemAssets).toHaveBeenCalled()
		expect(spies.delete).not.toHaveBeenCalled()
	})
	test('builder', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		command.builder?.(args)

		expect(spies.option).toHaveBeenCalledTimes(2)
	})
})
