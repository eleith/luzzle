import type { MockInstance } from 'vitest';
import { describe, expect, test, vi, afterEach } from 'vitest'
import type { SyncArgv } from './sync.js';
import command from './sync.js'
import type { Arguments } from 'yargs';
import yargs from 'yargs'
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

	test('run executes mutations and prunes assets', async () => {
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
			{ action: 'added', file: 'item1' },
			{ action: 'updated', file: 'item2' },
			{ action: 'skipped', file: 'item3' },
			{ error: true, file: 'item4', message: 'error message' },
		])
		const prunePiece = Readable.from([
			{ action: 'pruned', file: 'item1' },
			{ error: true, file: 'item2', message: 'error message' },
		])

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockResolvedValue()
		spies.logError = vi.spyOn(ctx.log, 'error').mockResolvedValue()
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
		spies.piecesDiff = vi.spyOn(ctx.pieces, 'diff')
		spies.piecesSync = vi.spyOn(ctx.pieces, 'sync').mockResolvedValue(syncPieces)
		spies.piecesPrune = vi.spyOn(ctx.pieces, 'prune').mockResolvedValue(prunePieces)
		spies.pieceSync = vi.spyOn(piece, 'sync').mockResolvedValue(syncPiece)
		spies.piecePrune = vi.spyOn(piece, 'prune').mockResolvedValue(prunePiece)

		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true } as Arguments<SyncArgv>)

		expect(spies.piecesDiff).not.toHaveBeenCalled()
		expect(spies.piecesSync).toHaveBeenCalledWith(expect.anything(), { force: undefined })
		expect(spies.piecesPrune).toHaveBeenCalledWith(expect.anything())
		expect(spies.pieceSync).toHaveBeenCalledWith(expect.anything(), files, { force: undefined })
		expect(spies.piecePrune).toHaveBeenCalledWith(expect.anything(), files)
		expect(spies.storageDelete).toHaveBeenCalledOnce()
	})

	test('run with dryRun and force reports the diff without writing', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const dbAssets = ['a', 'b', 'c']

		spies.logInfo = vi.spyOn(ctx.log, 'info').mockResolvedValue()
		spies.getFilesIn = vi.spyOn(ctx.pieces, 'getFilesIn').mockResolvedValue({
			pieces: ['a'],
			assets: ['d'],
			types: ['books'],
			directories: [],
		})
		spies.storageDelete = vi.spyOn(ctx.storage, 'delete')
		spies.piecesSync = vi.spyOn(ctx.pieces, 'sync')
		spies.piecesPrune = vi.spyOn(ctx.pieces, 'prune')
		spies.piecesDiff = vi.spyOn(ctx.pieces, 'diff').mockResolvedValue({
			schemas: { added: ['books'], updated: ['notes'], pruned: ['old'] },
			pieces: { added: ['a.books.md'], updated: ['b.books.md'], pruned: ['c.books.md'] },
		})

		mocks.selectItemAssets.mockResolvedValue(dbAssets)

		await command.run(ctx, { prune: true, force: true } as Arguments<SyncArgv>)

		expect(spies.piecesDiff).toHaveBeenCalledWith(expect.anything(), { force: true })
		expect(spies.piecesSync).not.toHaveBeenCalled()
		expect(spies.piecesPrune).not.toHaveBeenCalled()
		expect(spies.logInfo).toHaveBeenCalledWith('[added] piece type: books')
		expect(spies.logInfo).toHaveBeenCalledWith('[updated] piece: b.books.md')
		expect(spies.logInfo).toHaveBeenCalledWith('[pruned] piece: c.books.md')
		expect(spies.storageDelete).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs()

		spies.option = vi.spyOn(args, 'option')
		command.builder?.(args)

		expect(spies.option).toHaveBeenCalledTimes(2)
	})
})
