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
const completionTime = 1_800_000_000_000

beforeEach(async () => {
	vi.spyOn(Date, 'now').mockReturnValue(completionTime)
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
	vi.restoreAllMocks()
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

async function publishMetadata(
	filePath: string,
	contentHash: string | null,
	lastPublishedAt: number | null = null
) {
	await webSyncStep.run({ filePaths: [filePath] }, ctx)
	await db
		.updateTable('web_pieces')
		.set({ content_hash: contentHash, last_published_at: lastPublishedAt })
		.where('file_path', '=', filePath)
		.execute()
}

async function publicationState(filePath: string) {
	return db
		.selectFrom('web_pieces')
		.select(['content_hash', 'last_published_at'])
		.where('file_path', '=', filePath)
		.executeTakeFirstOrThrow()
}

async function publishedHash(filePath: string) {
	return (await publicationState(filePath)).content_hash
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

	test('metadata refresh invalidates the hash but retains the time; new metadata has no completion markers', async () => {
		await indexPiece('existing.books.md', 'new-hash')
		await indexPiece('new.books.md', 'new-hash')
		await publishMetadata('existing.books.md', 'old-hash', 123)

		await webSyncStep.run({ filePaths: ['existing.books.md', 'new.books.md'] }, ctx)

		expect(await publicationState('existing.books.md')).toEqual({
			content_hash: null,
			last_published_at: 123,
		})
		expect(await publicationState('new.books.md')).toEqual({
			content_hash: null,
			last_published_at: null,
		})
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
		await indexPiece('untouched.books.md', 'untouched-hash')
		await publishMetadata('healthy.books.md', 'old-healthy-hash', 123)
		await publishMetadata('failed.books.md', 'old-failed-hash', 456)
		await publishMetadata('untouched.books.md', 'untouched-hash', 789)

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

		expect(await publicationState('healthy.books.md')).toEqual({
			content_hash: 'processed-hash',
			last_published_at: completionTime,
		})
		expect(await publicationState('failed.books.md')).toEqual({
			content_hash: 'old-failed-hash',
			last_published_at: 456,
		})
		expect(await publicationState('untouched.books.md')).toEqual({
			content_hash: 'untouched-hash',
			last_published_at: 789,
		})
		const pending = await getPendingPublication(db, ctx.config)
		expect(pending.diff.updated).toEqual(['failed.books.md', 'healthy.books.md'])
	})

	test('first completion and a new captured hash record the current time atomically', async () => {
		await indexPiece('new.books.md', 'indexed-hash')
		await webSyncStep.run({ filePaths: ['new.books.md'] }, ctx)
		const input = {
			pieces: [{ filePath: 'new.books.md', contentHash: "captured'hash" }],
			failedPieces: [],
		}

		await publishCompleteStep.run(input, ctx)
		expect(await publicationState('new.books.md')).toEqual({
			content_hash: "captured'hash",
			last_published_at: completionTime,
		})

		vi.mocked(Date.now).mockReturnValue(completionTime + 1000)
		input.pieces[0]!.contentHash = 'next-captured-hash'
		await publishCompleteStep.run(input, ctx)
		expect(await publicationState('new.books.md')).toEqual({
			content_hash: 'next-captured-hash',
			last_published_at: completionTime + 1000,
		})
	})

	test('same-hash retries record the latest successful completion time', async () => {
		await indexPiece('retry.books.md', 'same-hash')
		await publishMetadata('retry.books.md', 'same-hash', 123)
		const input = {
			pieces: [{ filePath: 'retry.books.md', contentHash: 'same-hash' }],
			failedPieces: [],
		}

		await publishCompleteStep.run(input, ctx)
		expect(await publicationState('retry.books.md')).toEqual({
			content_hash: 'same-hash',
			last_published_at: completionTime,
		})
		vi.mocked(Date.now).mockReturnValue(completionTime + 1000)
		await publishCompleteStep.run(input, ctx)
		expect(await publicationState('retry.books.md')).toEqual({
			content_hash: 'same-hash',
			last_published_at: completionTime + 1000,
		})
	})

	test('legacy null times are populated only for successful completion, even with the same hash', async () => {
		for (const filePath of ['legacy.books.md', 'failed.books.md']) {
			await indexPiece(filePath, 'same-hash')
			await publishMetadata(filePath, 'same-hash')
		}
		await publishCompleteStep.run(
			{
				pieces: ['legacy.books.md', 'failed.books.md'].map((filePath) => ({
					filePath,
					contentHash: 'same-hash',
				})),
				failedPieces: [{ filePath: 'failed.books.md', message: 'transform failed' }],
			},
			ctx
		)
		expect(await publicationState('legacy.books.md')).toEqual({
			content_hash: 'same-hash',
			last_published_at: completionTime,
		})
		expect(await publicationState('failed.books.md')).toEqual({
			content_hash: 'same-hash',
			last_published_at: null,
		})
	})

	test('all successful pieces share one completion timestamp', async () => {
		const filePaths = ['first.books.md', 'second.books.md']
		for (const filePath of filePaths) {
			await indexPiece(filePath, 'new-hash')
			await publishMetadata(filePath, 'old-hash', 123)
		}
		vi.mocked(Date.now)
			.mockClear()
			.mockReturnValueOnce(completionTime)
			.mockReturnValue(completionTime + 1000)

		await publishCompleteStep.run(
			{
				pieces: filePaths.map((filePath) => ({ filePath, contentHash: 'new-hash' })),
				failedPieces: [],
			},
			ctx
		)

		expect(Date.now).toHaveBeenCalledOnce()
		for (const filePath of filePaths) {
			expect(await publicationState(filePath)).toEqual({
				content_hash: 'new-hash',
				last_published_at: completionTime,
			})
		}
	})

	test('empty plans leave existing markers untouched and completion does not recreate removed rows', async () => {
		await indexPiece('untouched.books.md', 'same-hash')
		await publishMetadata('untouched.books.md', 'same-hash', 123)
		await indexPiece('removed.books.md', 'removed-hash')
		await publishMetadata('removed.books.md', 'old-hash', 456)
		await db.deleteFrom('web_pieces').where('file_path', '=', 'removed.books.md').execute()

		await publishCompleteStep.run({ pieces: [], failedPieces: [] }, ctx)
		await publishCompleteStep.run(
			{
				pieces: [{ filePath: 'removed.books.md', contentHash: 'removed-hash' }],
				failedPieces: [],
			},
			ctx
		)
		expect(
			await db
				.selectFrom('web_pieces')
				.select(['file_path', 'content_hash', 'last_published_at'])
				.execute()
		).toEqual([
			{ file_path: 'untouched.books.md', content_hash: 'same-hash', last_published_at: 123 },
		])
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
