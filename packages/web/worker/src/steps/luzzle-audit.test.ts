import { describe, test, expect, vi, beforeEach } from 'vitest'
import { luzzleAuditStep } from './luzzle-audit.js'
import { Pieces, StorageFileSystem, getDatabaseClient } from '@luzzle/core'
import type { WorkerContext } from '../services/context.js'
import type { Config } from '@luzzle/web.config'
import { getPendingPublication } from '../services/publication.js'

vi.mock('@luzzle/core', () => ({
	Pieces: vi.fn(),
	StorageFileSystem: vi.fn(),
	getDatabaseClient: vi.fn(),
}))

vi.mock('../services/publication.js', () => ({ getPendingPublication: vi.fn() }))

vi.mock('../services/db.js', () => ({
	resolveDbPath: vi.fn(() => '/app/data/db.sqlite'),
}))

const mocks = {
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	getDatabaseClient: vi.mocked(getDatabaseClient),
}

function makeCtx(): WorkerContext {
	return {
		config: {
			storage: { root: '/app/archive' },
			paths: { database: 'data/db.sqlite' },
		} as Config,
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		},
		rclone: {} as WorkerContext['rclone'],
		db: {} as WorkerContext['db'],
	}
}

describe('luzzleAuditStep', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getPendingPublication).mockResolvedValue({
			pieces: [],
			diff: { added: [], updated: [], pruned: [] },
		})
	})

	test('runs pieces.diff and returns the structured diff', async () => {
		const ctx = makeCtx()
		const diff = {
			schemas: { added: ['blog'], updated: [], pruned: [] },
			pieces: { added: ['a.md'], updated: ['b.md'], pruned: ['c.md'] },
		}
		const mockPieces = { diff: vi.fn().mockResolvedValue(diff) }
		mocks.StorageFileSystem.mockReturnValue({} as never)
		mocks.getDatabaseClient.mockReturnValue({} as never)
		mocks.Pieces.mockReturnValue(mockPieces as never)

		const result = await luzzleAuditStep.run(undefined, ctx)

		expect(StorageFileSystem).toHaveBeenCalledWith('/app/archive')
		expect(mockPieces.diff).toHaveBeenCalled()
		expect(result.status).toBe('completed')
		if (result.status === 'completed') {
			expect(result.value).toEqual(diff)
			expect(result.message).toBe('4 pending change(s)')
		}
	})

	test('includes indexed but unpublished changes without duplicating source changes', async () => {
		const ctx = makeCtx()
		const sourceDiff = {
			schemas: { added: [], updated: [], pruned: [] },
			pieces: { added: ['new.md'], updated: ['changed.md'], pruned: [] },
		}
		mocks.StorageFileSystem.mockReturnValue({} as never)
		mocks.getDatabaseClient.mockReturnValue({} as never)
		mocks.Pieces.mockReturnValue({ diff: vi.fn().mockResolvedValue(sourceDiff) } as never)
		vi.mocked(getPendingPublication).mockResolvedValue({
			pieces: [],
			diff: { added: ['new.md'], updated: ['changed.md', 'failed.md'], pruned: ['gone.md'] },
		})

		const result = await luzzleAuditStep.run(undefined, ctx)

		expect(getPendingPublication).toHaveBeenCalledWith(ctx.db, ctx.config)
		expect(result).toEqual({
			status: 'completed',
			value: {
				schemas: sourceDiff.schemas,
				pieces: { added: ['new.md'], updated: ['changed.md', 'failed.md'], pruned: ['gone.md'] },
			},
			message: '4 pending change(s)',
		})
		expect(sourceDiff.pieces.updated).toEqual(['changed.md'])
	})

	test('reports zero pending changes for an empty diff', async () => {
		const ctx = makeCtx()
		const diff = {
			schemas: { added: [], updated: [], pruned: [] },
			pieces: { added: [], updated: [], pruned: [] },
		}
		const mockPieces = { diff: vi.fn().mockResolvedValue(diff) }
		mocks.StorageFileSystem.mockReturnValue({} as never)
		mocks.getDatabaseClient.mockReturnValue({} as never)
		mocks.Pieces.mockReturnValue(mockPieces as never)

		const result = await luzzleAuditStep.run(undefined, ctx)

		if (result.status === 'completed') {
			expect(result.message).toBe('0 pending change(s)')
		}
	})
})
