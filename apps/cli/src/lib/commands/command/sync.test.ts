import { describe, expect, test, vi, afterEach, MockInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeContext, makePieceMock } from '../utils/context.fixtures.js'
import { selectItemAssets } from '@luzzle/core'
import { Readable } from 'stream'

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

	test('run', async () => {
		const piece = makePieceMock()
		const ctx = makeContext()
		const type = piece.type
		const files = ['a', 'b', 'c']
		const dbAssets = ['a', 'b', 'c']
		const syncPieces = Readable.from([
			{ action: 'added', name: type },
			{ action: 'updated', name: type },
			{ action: 'skipped', name: type },
			{ error: true, name: type, message: 'error message' },
		])
		const prunePieces = Readable.from([
			{ action: 'pruned', name: type },
			{ error: true, name: type, message: 'error message' },
		])
		const syncPiece = Readable.from([
			{ action: 'added', name: 'item1' },
			{ action: 'updated', name: 'item2' },
			{ action: 'skipped', name: 'item3' },
			{ error: true, name: 'item4', message: 'error message' },
		])
		const prunePiece = Readable.from([
			{ action: 'pruned', name: 'item1' },
			{ error: true, name: 'item2', message: 'error message' },
		])

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockResolvedValue()
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: files,
			assets: ['d'],
			types: [type],
			directories: [],
		})
		spies.getPiece = vi.spyOn(ctx.pieces, 'getPiece').mockResolvedValue(piece)
		spies.parseFilename = vi
			.spyOn(ctx.pieces, 'parseFilename')
			.mockReturnValue({ type, file: '', format: 'md', slug: '' })

		spies.storageDelete = vi.spyOn(ctx.storage, 'delete')
		spies.pieceIsOutdated = vi.spyOn(piece, 'isOutdated').mockResolvedValue(true)
		spies.piecesSync = vi.spyOn(ctx.pieces, 'sync').mockResolvedValue(syncPieces)
		spies.piecesPrune = vi.spyOn(ctx.pieces, 'prune').mockResolvedValue(prunePieces)
		spies.pieceSync = vi.spyOn(piece, 'sync').mockResolvedValue(syncPiece)
		spies.piecePrune = vi.spyOn(piece, 'prune').mockResolvedValue(prunePiece)

		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true } as Arguments<SyncArgv>)

		expect(spies.piecesSync).toHaveBeenCalledOnce()
		expect(spies.piecesPrune).toHaveBeenCalledOnce()
		expect(spies.pieceSync).toHaveBeenCalledOnce()
		expect(spies.piecePrune).toHaveBeenCalledOnce()
		expect(spies.storageDelete).toHaveBeenCalledOnce()
	})

	test('run with dryRun and force', async () => {
		const piece = makePieceMock()
		const ctx = makeContext({ flags: { dryRun: true } })
		const type = piece.type
		const files = ['a', 'b', 'c']
		const dbAssets = ['a', 'b', 'c']
		const passThrough = Readable.from([])

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockResolvedValue()
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: files,
			assets: ['d'],
			types: [type],
			directories: [],
		})
		spies.getPiece = vi.spyOn(ctx.pieces, 'getPiece').mockResolvedValue(piece)
		spies.parseFilename = vi
			.spyOn(ctx.pieces, 'parseFilename')
			.mockReturnValue({ type, file: '', format: 'md', slug: '' })

		spies.storageDelete = vi.spyOn(ctx.storage, 'delete')
		spies.pieceIsOutdated = vi.spyOn(piece, 'isOutdated').mockResolvedValue(true)
		spies.piecesSync = vi.spyOn(ctx.pieces, 'sync').mockResolvedValue(passThrough)
		spies.piecesPrune = vi.spyOn(ctx.pieces, 'prune').mockResolvedValue(passThrough)
		spies.pieceSync = vi.spyOn(piece, 'sync').mockResolvedValue(passThrough)
		spies.piecePrune = vi.spyOn(piece, 'prune').mockResolvedValue(passThrough)

		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true, force: true } as Arguments<SyncArgv>)

		expect(spies.piecesSync).toHaveBeenCalledWith(expect.anything(), { dryRun: true, force: true })
		expect(spies.piecesPrune).toHaveBeenCalledWith(expect.anything(), { dryRun: true })
		expect(spies.pieceSync).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
			dryRun: true,
			force: true,
		})
		expect(spies.piecePrune).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
			dryRun: true,
		})
		expect(spies.storageDelete).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		command.builder?.(args)

		expect(spies.option).toHaveBeenCalledTimes(2)
	})
})
