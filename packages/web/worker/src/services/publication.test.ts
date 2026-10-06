import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Config } from '@luzzle/web.config'
import type { Kysely } from 'kysely'
import type { AppDatabase } from './db.js'
import type { WorkerContext } from './context.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { getPendingPublication } from './publication.js'
import { publishPrepareStep } from '../steps/publish-prepare.js'
import { publishCompleteStep } from '../steps/publish-complete.js'
import { webSyncStep } from '../steps/web-sync/index.js'
import { emptyPiecesDiff } from '../workflows/pieces-diff.js'

let db: Kysely<AppDatabase>
let ctx: WorkerContext

beforeEach(async () => {
	db = (await setupDatabase()).withTables<AppDatabase>()
	ctx = {
		db,
		config: {
			assets: { salt: 'test' },
			pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date_read' } }],
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
	}
})

afterEach(async () => {
	await teardownDatabase(db)
})

async function indexPiece(filePath: string, contentHash?: string, type = 'books') {
	await db
		.insertInto('pieces_items')
		.values({
			id: filePath,
			file_path: filePath,
			type,
			date_added: 1,
			frontmatter_json: '{"title":"Test piece"}',
			note_markdown: 'Test note',
		})
		.execute()
	if (contentHash !== undefined) {
		await db
			.insertInto('pieces_cache')
			.values({
				id: filePath,
				file_path: filePath,
				content_hash: contentHash,
			})
			.execute()
	}
}

async function publishMetadata(filePath: string, contentHash: string | null) {
	await webSyncStep.run({ filePaths: [filePath] }, ctx)
	await db
		.updateTable('web_pieces')
		.set({ content_hash: contentHash })
		.where('file_path', '=', filePath)
		.execute()
}

async function publishedHash(filePath: string) {
	const piece = await db
		.selectFrom('web_pieces')
		.select('content_hash')
		.where('file_path', '=', filePath)
		.executeTakeFirstOrThrow()
	return piece.content_hash
}

describe('publication', () => {
	test('finds missing, stale and never-completed web rows, excluding published and unconfigured pieces', async () => {
		await indexPiece('new.books.md', 'new-hash')
		await indexPiece('changed.books.md', 'current-hash')
		await indexPiece('unfinished.books.md', 'unfinished-hash')
		await indexPiece('healthy.books.md', 'healthy-hash')
		await indexPiece('unconfigured.films.md', 'film-hash', 'films')
		await publishMetadata('changed.books.md', 'old-hash')
		await publishMetadata('unfinished.books.md', null)
		await publishMetadata('healthy.books.md', 'healthy-hash')

		const pending = await getPendingPublication(db, ctx.config)

		expect(pending).toEqual({
			pieces: [
				{ filePath: 'changed.books.md', contentHash: 'current-hash' },
				{ filePath: 'new.books.md', contentHash: 'new-hash' },
				{ filePath: 'unfinished.books.md', contentHash: 'unfinished-hash' },
			],
			diff: {
				added: ['new.books.md'],
				updated: ['changed.books.md', 'unfinished.books.md'],
				pruned: [],
			},
		})
	})

	test('reports deleted web rows even after the core index has consumed the deletion', async () => {
		await indexPiece('gone.books.md', 'gone-hash')
		await publishMetadata('gone.books.md', 'gone-hash')
		await db.deleteFrom('pieces_items').where('file_path', '=', 'gone.books.md').execute()

		expect(await getPendingPublication(db, ctx.config)).toEqual({
			pieces: [],
			diff: { added: [], updated: [], pruned: ['gone.books.md'] },
		})
	})

	test('does not label a missing core hash successfully published or prune its live row', async () => {
		await indexPiece('uncached.books.md')
		await publishMetadata('uncached.books.md', null)

		expect(await getPendingPublication(db, ctx.config)).toEqual({
			pieces: [],
			diff: { added: [], updated: [], pruned: [] },
		})
		expect(await publishedHash('uncached.books.md')).toBeNull()
	})

	test('metadata refresh invalidates success before output changes; new metadata starts with no success hash', async () => {
		await indexPiece('existing.books.md', 'new-hash')
		await indexPiece('new.books.md', 'new-hash')
		await publishMetadata('existing.books.md', 'old-hash')

		await webSyncStep.run({ filePaths: ['existing.books.md', 'new.books.md'] }, ctx)

		expect(await publishedHash('existing.books.md')).toBeNull()
		expect(await publishedHash('new.books.md')).toBeNull()
	})

	test('prepare captures pending hashes and includes recovery paths in the report', async () => {
		await indexPiece('new.books.md', 'new-hash')
		await indexPiece('changed.books.md', 'current-hash')
		await publishMetadata('changed.books.md', 'old-hash')
		const summary = emptyPiecesDiff()
		summary.pieces.added.push('new.books.md')

		const prepared = await publishPrepareStep.run(summary, ctx)

		expect(prepared).toEqual({
			status: 'completed',
			value: {
				pieces: [
					{ filePath: 'changed.books.md', contentHash: 'current-hash' },
					{ filePath: 'new.books.md', contentHash: 'new-hash' },
				],
				summary: {
					schemas: summary.schemas,
					pieces: { added: ['new.books.md'], updated: ['changed.books.md'], pruned: [] },
				},
			},
		})
		expect(summary.pieces.updated).toEqual([])
	})

	test('complete advances healthy pieces only, using their captured hashes', async () => {
		await indexPiece('healthy.books.md', 'even-newer-hash')
		await indexPiece('failed.books.md', 'failed-hash')
		await publishMetadata('healthy.books.md', 'old-healthy-hash')
		await publishMetadata('failed.books.md', 'old-failed-hash')

		await publishCompleteStep.run(
			{
				pieces: [
					{ filePath: 'healthy.books.md', contentHash: 'processed-hash' },
					{ filePath: 'failed.books.md', contentHash: 'failed-hash' },
				],
				failedPieces: [{ filePath: 'failed.books.md', message: 'image failed' }],
			},
			ctx
		)

		expect(await publishedHash('healthy.books.md')).toBe('processed-hash')
		expect(await publishedHash('failed.books.md')).toBe('old-failed-hash')
		const pending = await getPendingPublication(db, ctx.config)
		expect(pending.diff.updated).toEqual(['failed.books.md', 'healthy.books.md'])
	})

	test('complete and prepare accept an empty archive', async () => {
		expect(await publishPrepareStep.run(emptyPiecesDiff(), ctx)).toEqual({
			status: 'completed',
			value: { pieces: [], summary: emptyPiecesDiff() },
		})
		expect(await publishCompleteStep.run({ pieces: [], failedPieces: [] }, ctx)).toEqual({
			status: 'completed',
			value: undefined,
		})
	})
})
