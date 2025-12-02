import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext, makePieceMock, makeMarkdownSample } from '../utils/context.fixtures.js'
import { selectItemAssets, PieceFrontmatterSchema, PieceFrontmatter } from '@luzzle/core'

vi.mock('@luzzle/core')

const spies: { [key: string]: MockInstance } = {}

const mocks = {
	selectItemAssets: vi.mocked(selectItemAssets),
}

describe('commands/command/sync.ts', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('run with dryRun', async () => {
		const piece = makePieceMock()
		const ctx = makeContext({ flags: { dryRun: true } })
		const type = piece.type
		const files = ['a', 'b', 'c']
		const dbAssets = ['a', 'b', 'c']

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockResolvedValue()
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: files,
			assets: ['d', 'e'],
			types: [type],
			directories: [],
		})
		spies.getPiece = vi.spyOn(ctx.pieces, 'getPiece').mockResolvedValue(piece)
		spies.parseFilename = vi
			.spyOn(ctx.pieces, 'parseFilename')
			.mockReturnValue({ type, file: '', format: 'md', slug: '' })

		spies.piecesGetSyncOperations = vi
			.spyOn(ctx.pieces, 'getSyncOperations')
			.mockResolvedValueOnce({
				toAdd: [{ name: type, schema: {} as PieceFrontmatterSchema<PieceFrontmatter> }],
				toUpdate: [{ name: type, schema: {} as PieceFrontmatterSchema<PieceFrontmatter> }],
			})
		spies.piecesGetPruneOperations = vi
			.spyOn(ctx.pieces, 'getPruneOperations')
			.mockResolvedValueOnce(['oldType'])
		        spies.pieceGetSyncOperations = vi
		            .spyOn(piece, 'getSyncOperations')
		            .mockResolvedValueOnce({ toAdd: [makeMarkdownSample()], toUpdate: [makeMarkdownSample()] })
		
		        spies.pieceGetPruneOperations = vi
		            .spyOn(piece, 'getPruneOperations')
		            .mockResolvedValueOnce([])
		
		spies.pieceGetPruneOperations = vi
			.spyOn(piece, 'getPruneOperations')
			.mockResolvedValueOnce(['oldFile.md'])
		spies.storageDelete = vi.spyOn(ctx.storage, 'delete')
		spies.pieceIsOutdated = vi.spyOn(piece, 'isOutdated').mockResolvedValue(true)
		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true } as Arguments<SyncArgv>)

		expect(ctx.pieces.sync).not.toHaveBeenCalled()
		expect(ctx.pieces.prune).not.toHaveBeenCalled()
		expect(piece.sync).not.toHaveBeenCalled()
		expect(piece.prune).not.toHaveBeenCalled()
		expect(ctx.storage.delete).not.toHaveBeenCalled()
	})

	test('run with dryRun and force shows all files in plan', async () => {
		const piece = makePieceMock()
		const ctx = makeContext({ flags: { dryRun: true } })
		const type = piece.type
		const files = ['a', 'b', 'c']

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockResolvedValue()
		spies.getPiece = vi.spyOn(ctx.pieces, 'getPiece').mockResolvedValue(piece)
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: files,
			assets: [],
			types: [type],
			directories: [],
		})
		spies.parseFilename = vi
			.spyOn(ctx.pieces, 'parseFilename')
			.mockReturnValue({ type, file: '', format: 'md', slug: '' })
		spies.pieceIsOutdated = vi.spyOn(piece, 'isOutdated').mockResolvedValue(false) // This is the key difference

		spies.piecesGetSyncOperations = vi
			.spyOn(ctx.pieces, 'getSyncOperations')
			.mockResolvedValueOnce({ toAdd: [], toUpdate: [] })
		spies.piecesGetPruneOperations = vi
			.spyOn(ctx.pieces, 'getPruneOperations')
			.mockResolvedValueOnce([])

		spies.pieceGetSyncOperations = vi
			.spyOn(piece, 'getSyncOperations')
			.mockResolvedValueOnce({ toAdd: [makeMarkdownSample()], toUpdate: [makeMarkdownSample()] })

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(spies.pieceGetSyncOperations).toHaveBeenCalledWith(ctx.db, files)
		expect(spies.logInfo).toHaveBeenCalledWith(expect.stringContaining('Items to add'))
		expect(spies.logInfo).toHaveBeenCalledWith(expect.stringContaining('Items to update'))
	})

	test('run normally executes writes and logs actions', async () => {
		const piece = makePieceMock()
		const ctx = makeContext({ flags: { dryRun: false } })
		const type = piece.type
		const files = ['a', 'b', 'c']
		const dbAssets = ['a', 'b', 'c']

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockReturnThis()
		spies.getPiece = vi.spyOn(ctx.pieces, 'getPiece').mockResolvedValue(piece)
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: files,
			assets: ['d', 'e'],
			types: [type],
			directories: [],
		})
		spies.parseFilename = vi
			.spyOn(ctx.pieces, 'parseFilename')
			.mockReturnValue({ type, file: '', format: 'md', slug: '' })

		spies.piecesSync = vi.spyOn(ctx.pieces, 'sync').mockResolvedValue()
		spies.piecesPrune = vi.spyOn(ctx.pieces, 'prune').mockResolvedValue()
		spies.pieceSync = vi.spyOn(piece, 'sync').mockResolvedValue()
		spies.piecePrune = vi.spyOn(piece, 'prune').mockResolvedValue([])
		spies.storageDelete = vi.spyOn(ctx.storage, 'delete').mockResolvedValue()
		spies.pieceIsOutdated = vi.spyOn(piece, 'isOutdated').mockResolvedValue(true)
		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true } as Arguments<SyncArgv>)

		expect(spies.piecesSync).toHaveBeenCalledOnce()
		expect(spies.piecesPrune).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledOnce()
		expect(spies.piecePrune).toHaveBeenCalledOnce()
		expect(selectItemAssets).toHaveBeenCalledOnce()
		expect(spies.storageDelete).toHaveBeenCalledTimes(2)
		expect(spies.logInfo).toHaveBeenCalledWith(expect.stringContaining('--- Starting normal run'))
		expect(spies.logInfo).toHaveBeenCalledWith(expect.stringContaining('pruned asset (disk)'))
	})

	test('run with force executes writes even if not outdated', async () => {
		const piece = makePieceMock()
		const ctx = makeContext({ flags: { dryRun: false } })
		const type = piece.type
		const files = ['a', 'b', 'c']
		const dbAssets = ['a', 'b', 'c']

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockReturnThis()
		spies.getPiece = vi.spyOn(ctx.pieces, 'getPiece').mockResolvedValue(piece)
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: files,
			assets: ['d', 'e'],
			types: [type],
			directories: [],
		})
		spies.parseFilename = vi
			.spyOn(ctx.pieces, 'parseFilename')
			.mockReturnValue({ type, file: '', format: 'md', slug: '' })

		spies.piecesSync = vi.spyOn(ctx.pieces, 'sync').mockResolvedValue()
		spies.piecesPrune = vi.spyOn(ctx.pieces, 'prune').mockResolvedValue()
		spies.pieceSync = vi.spyOn(piece, 'sync').mockResolvedValue()
		spies.piecePrune = vi.spyOn(piece, 'prune').mockResolvedValue([])
		spies.storageDelete = vi.spyOn(ctx.storage, 'delete').mockResolvedValue()
		spies.pieceIsOutdated = vi.spyOn(piece, 'isOutdated').mockResolvedValue(false) // This is the key difference
		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true, force: true } as Arguments<SyncArgv>)

		expect(spies.piecesSync).toHaveBeenCalledOnce()
		expect(spies.piecesPrune).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledOnce()
		expect(spies.piecePrune).toHaveBeenCalledOnce()
		expect(selectItemAssets).toHaveBeenCalledOnce()
		expect(spies.storageDelete).toHaveBeenCalledTimes(2)
	})

	test('builder', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		command.builder?.(args)

		expect(spies.option).toHaveBeenCalledTimes(2)
	})
})
