import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { asCoreDatabase, migrate } from '@luzzle/core'
import { validateConfig } from '@luzzle/web.config'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import type { PublishPayload, PublishPiecePayload, PublishResult } from '@luzzle/web.jobs'
import { publishSpec } from '@luzzle/web.jobs/specs'
import type { Workflow } from 'openworkflow'
import { completed } from '../core/step.js'
import { RcloneClient } from '../services/rclone.js'
import { getPendingPublication } from '../services/publication.js'
import { setWorkerContext, type WorkerContext } from '../services/context.js'
import { archiveSyncStep } from '../steps/archive-sync.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import type * as TransformRunner from '../transforms/runner.js'
import { registerPublishWorkflow } from './publish.js'

type PublishInput = PublishPayload | PublishPiecePayload
type PublishWorkflow = Workflow<PublishInput, PublishResult, PublishInput>['fn']
type WorkflowStep = Parameters<PublishWorkflow>[0]['step']

const mocks = vi.hoisted(() => ({
	implementWorkflow: vi.fn<(spec: typeof publishSpec, fn: PublishWorkflow) => void>(),
	produce: vi.fn<typeof TransformRunner.produceTransformsForPiece>(),
	copy: vi.fn(),
	cdn: vi.fn(),
	cache: vi.fn(),
}))

vi.mock('@luzzle/web.jobs', () => ({
	getOpenWorkflow: () => ({ implementWorkflow: mocks.implementWorkflow }),
}))
vi.mock('../transforms/runner.js', async (importOriginal) => ({
	...(await importOriginal<typeof TransformRunner>()),
	produceTransformsForPiece: mocks.produce,
}))
vi.mock('../steps/cdn-copy-files.js', () => ({
	cdnCopyFilesStep: { name: 'cdn.copy-files', run: mocks.copy },
}))
vi.mock('../steps/cdn-sync.js', () => ({
	cdnSyncStep: { name: 'cdn.sync', run: mocks.cdn },
}))
vi.mock('../steps/cache-purge.js', () => ({
	cachePurgeStep: { name: 'cache.purge', run: mocks.cache },
}))

const target = 'target.books.md'
const pending = 'pending.books.md'
const removed = 'removed.books.md'
const publishedAt = 1_900_000_000_000
const hash = (rawContent: string) => createHash('md5').update(rawContent).digest('hex')

// Real archive, SQLite, source loading, upserts, transform persistence and completion.
// Only expensive rendering and external delivery are replaced.
describe('registered publication workflow', () => {
	let directory: string
	let ctx: WorkerContext
	let workflow: PublishWorkflow

	beforeEach(async () => {
		vi.resetAllMocks()
		vi.spyOn(Date, 'now').mockReturnValue(publishedAt)
		for (const delivery of [mocks.copy, mocks.cdn, mocks.cache]) {
			delivery.mockResolvedValue(completed(undefined))
		}
		mocks.produce.mockImplementation(async (piece, _config, outDir) => {
			const assetPath = `${piece.key}/note.html`
			await mkdir(path.join(outDir, piece.key), { recursive: true })
			await writeFile(path.join(outDir, assetPath), piece.note ?? '')
			return [
				{
					name: 'markdown',
					records: [
						{ transformation: 'markdown.file', asset_path: assetPath, mime_type: 'text/html' },
						{
							transformation: 'markdown',
							mime_type: 'text/html',
							is_embedded: 1,
							content: piece.note,
						},
					],
				},
			]
		})
		directory = await mkdtemp(path.join(tmpdir(), 'luzzle-publish-'))
		const archive = path.join(directory, 'archive')
		await mkdir(path.join(archive, '.luzzle', 'schemas'), { recursive: true })
		await writeFile(
			path.join(archive, '.luzzle', 'schemas', 'books.json'),
			JSON.stringify({
				type: 'object',
				title: 'books',
				properties: {
					title: { type: 'string' },
					tags: { type: 'array', items: { type: 'string' } },
				},
				required: ['title'],
				additionalProperties: true,
			})
		)
		const config = validateConfig(
			{
				storage: { root: archive },
				paths: {
					config: path.join(directory, 'config.yaml'),
					database: 'index.sqlite',
					assets: path.join(directory, 'assets'),
				},
				assets: { salt: 'publish-test' },
				pieces: [
					{
						type: 'books',
						fields: { title: 'title', date_consumed: 'date_consumed', tags: 'tags' },
					},
				],
			},
			{}
		)
		const db = createAppDb(path.join(directory, 'index.sqlite'))
		expect((await migrate(asCoreDatabase(db))).error).toBeUndefined()
		expect((await runWebMigrations(db)).error).toBeUndefined()
		const logger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		}
		ctx = { db, config, logger, rclone: new RcloneClient(logger) }
		setWorkerContext(ctx)
		registerPublishWorkflow()
		expect(mocks.implementWorkflow).toHaveBeenCalledOnce()
		expect(mocks.implementWorkflow.mock.calls[0]![0]).toBe(publishSpec)
		workflow = mocks.implementWorkflow.mock.calls[0]![1]
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		await ctx?.db.destroy()
		await rm(directory, { recursive: true, force: true })
	})

	async function writePiece(filePath: string, title: string) {
		const rawContent = `---\ntitle: ${title}\ntags: [${title}]\n---\n\nNote for ${title}.\n`
		const destination = path.join(ctx.config.storage.root, filePath)
		await writeFile(destination, rawContent)
		// Avoid relying on filesystem timestamp resolution for the real indexer.
		await utimes(destination, new Date(), new Date(Date.now() + 10_000))
		return { rawContent }
	}

	async function publish(input: PublishInput = {}, jobId = 'publish-test') {
		const step = {
			run: async <Output>(
				_config: { name: string },
				fn: () => Promise<Output | undefined> | Output | undefined
			) => (await fn()) as Output,
		} as WorkflowStep
		return workflow({
			input,
			step,
			version: null,
			run: { id: jobId, workflowName: publishSpec.name, createdAt: new Date(), startedAt: null },
		})
	}

	async function publicRows(filePath: string) {
		const piece = await ctx.db
			.selectFrom('web_pieces')
			.selectAll()
			.where('file_path', '=', filePath)
			.executeTakeFirstOrThrow()
		return {
			piece,
			assets: await ctx.db
				.selectFrom('web_pieces_assets')
				.selectAll()
				.where('piece_file_path', '=', filePath)
				.orderBy('transformation')
				.execute(),
			tags: await ctx.db
				.selectFrom('web_pieces_tags')
				.selectAll()
				.where('piece_id', '=', piece.id)
				.orderBy('tag')
				.execute(),
		}
	}

	async function coreRows() {
		return {
			items: await ctx.db.selectFrom('pieces_items').selectAll().orderBy('file_path').execute(),
			cache: await ctx.db.selectFrom('pieces_cache').selectAll().orderBy('file_path').execute(),
		}
	}

	function clearEffects() {
		for (const effect of [mocks.produce, mocks.copy, mocks.cdn, mocks.cache]) effect.mockClear()
	}

	test('a queued filename publishes saved B without touching pending C or removed public D', async () => {
		for (const filePath of [target, pending, removed]) await writePiece(filePath, 'Original')
		await publish()
		const original = (await publicRows(target)).piece
		await writePiece(target, 'Queued A')
		const queued: PublishPiecePayload = { filePath: target }
		const saved = await writePiece(target, 'Saved B')
		await writePiece(pending, 'Pending C')
		await rm(path.join(ctx.config.storage.root, removed))
		await luzzleSyncStep.run(undefined, ctx)
		const coreBefore = await coreRows()
		expect(coreBefore.cache.find((row) => row.file_path === target)?.content_hash).toBe(
			hash(saved.rawContent)
		)
		const pendingBefore = await publicRows(pending)
		const removedBefore = await publicRows(removed)
		clearEffects()
		const archive = vi.spyOn(archiveSyncStep, 'run')
		const index = vi.spyOn(luzzleSyncStep, 'run')

		const result = await publish(queued)

		expect(result).toMatchObject({
			pieces: { added: [], updated: [target], pruned: [] },
			failedPieces: [],
		})
		const published = await publicRows(target)
		expect(published.piece).toMatchObject({
			id: original.id,
			slug: original.slug,
			date_added: original.date_added,
			title: 'Saved B',
			note: 'Note for Saved B.',
			content_hash: hash(saved.rawContent),
		})
		expect(JSON.parse(published.piece.json_metadata).title).toBe('Saved B')
		expect(published.tags.map(({ tag }) => tag)).toEqual(['Saved B'])
		expect(
			published.assets.find(({ transformation }) => transformation === 'markdown')
		).toMatchObject({ content: 'Note for Saved B.', is_embedded: 1 })
		const manifest = [`${published.piece.key}/note.html`]
		expect(mocks.produce).toHaveBeenCalledOnce()
		expect(mocks.produce.mock.calls[0]![0]).toMatchObject({
			title: 'Saved B',
			note: 'Note for Saved B.',
		})
		expect(mocks.copy).toHaveBeenCalledExactlyOnceWith({ filePaths: manifest }, ctx)
		expect(await readFile(path.join(ctx.config.paths.assets, manifest[0]!), 'utf8')).toBe(
			'Note for Saved B.'
		)
		expect(mocks.cache).toHaveBeenCalledOnce()
		expect(mocks.cdn).not.toHaveBeenCalled()
		expect(archive).not.toHaveBeenCalled()
		expect(index).not.toHaveBeenCalled()
		expect(await coreRows()).toEqual(coreBefore)
		expect(await readFile(path.join(ctx.config.storage.root, target), 'utf8')).toBe(
			saved.rawContent
		)
		expect(await publicRows(pending)).toEqual(pendingBefore)
		expect(await publicRows(removed)).toEqual(removedBefore)
		expect((await getPendingPublication(ctx.db, ctx.config)).diff).toEqual({
			added: [],
			updated: [pending],
			pruned: [removed],
		})
	})

	test('archive selection uses the shared renderer/upsert, prunes globally and delivers the whole CDN once', async () => {
		for (const filePath of [target, pending, removed]) await writePiece(filePath, 'Original')
		await publish()
		const original = (await publicRows(target)).piece
		const pendingBefore = await publicRows(pending)
		const selected = await writePiece(target, 'Selected revision')
		await writePiece(pending, 'Unselected revision')
		await writePiece('new.books.md', 'New unselected')
		await rm(path.join(ctx.config.storage.root, removed))
		clearEffects()

		const result = await publish({ filePaths: [target, target, removed, 'missing.books.md'] })

		expect(result.pieces).toEqual({ added: [], updated: [target], pruned: [removed] })
		expect(result.failedPieces).toEqual([])
		const published = await publicRows(target)
		expect(published.piece).toMatchObject({
			id: original.id,
			slug: original.slug,
			title: 'Selected revision',
			content_hash: hash(selected.rawContent),
			last_published_at: publishedAt,
		})
		expect(published.tags.map(({ tag }) => tag)).toEqual(['Selected revision'])
		expect(
			published.assets.find(({ transformation }) => transformation === 'markdown')
		).toMatchObject({ content: 'Note for Selected revision.' })
		expect(mocks.produce).toHaveBeenCalledOnce()
		expect(mocks.produce.mock.calls[0]![0].title).toBe('Selected revision')
		expect(mocks.cdn).toHaveBeenCalledExactlyOnceWith(undefined, ctx)
		expect(mocks.copy).not.toHaveBeenCalled()
		expect(await publicRows(pending)).toEqual(pendingBefore)
		expect(
			await ctx.db
				.selectFrom('web_pieces')
				.select('file_path')
				.where('file_path', 'in', [removed, 'new.books.md'])
				.execute()
		).toEqual([])
		expect(
			await ctx.db
				.selectFrom('web_pieces_assets')
				.selectAll()
				.where('piece_file_path', '=', removed)
				.execute()
		).toEqual([])
	})

	test('explicit empty archive selection still prunes and delivers, without publishing pending rows', async () => {
		await writePiece(target, 'Original')
		await writePiece(removed, 'Removed')
		await publish()
		const before = await publicRows(target)
		await writePiece(target, 'Pending')
		await rm(path.join(ctx.config.storage.root, removed))
		clearEffects()

		const result = await publish({ filePaths: [] })

		expect(result.pieces).toEqual({ added: [], updated: [], pruned: [removed] })
		expect(await publicRows(target)).toEqual(before)
		expect(
			await ctx.db.selectFrom('web_pieces').selectAll().where('file_path', '=', removed).execute()
		).toEqual([])
		expect(mocks.produce).not.toHaveBeenCalled()
		expect(mocks.cdn).toHaveBeenCalledOnce()
		expect(mocks.copy).not.toHaveBeenCalled()
	})

	test('a sibling render failure is reported and unstamped while healthy siblings complete; a fresh run retries only the failure', async () => {
		await writePiece(target, 'Healthy original')
		await writePiece(pending, 'Broken original')
		await publish()
		const oldFailed = (await publicRows(pending)).piece
		const healthy = await writePiece(target, 'Healthy revision')
		const broken = await writePiece(pending, 'Broken revision')
		const render = mocks.produce.getMockImplementation()!
		mocks.produce.mockImplementation(async (...args) => {
			if (args[0].file_path === pending) throw new Error('markdown transform failed')
			return render(...args)
		})
		vi.mocked(Date.now).mockReturnValue(publishedAt + 1000)

		const result = await publish({ filePaths: [target, pending] })

		expect(JSON.parse(JSON.stringify(result)).failedPieces).toEqual([
			{ filePath: pending, message: 'markdown transform failed' },
		])
		expect((await publicRows(target)).piece).toMatchObject({
			content_hash: hash(healthy.rawContent),
			last_published_at: publishedAt + 1000,
		})
		expect((await publicRows(pending)).piece).toMatchObject({
			title: 'Broken revision',
			content_hash: null,
			last_published_at: oldFailed.last_published_at,
		})
		mocks.produce.mockImplementation(render)
		clearEffects()

		const retry = await publish()

		expect(retry.pieces).toEqual({ added: [], updated: [pending], pruned: [] })
		expect(retry.failedPieces).toEqual([])
		expect(mocks.produce).toHaveBeenCalledOnce()
		expect(mocks.produce.mock.calls[0]![0].file_path).toBe(pending)
		expect((await publicRows(pending)).piece.content_hash).toBe(hash(broken.rawContent))
	})

	test('archive CDN failure leaves publication pending until a fresh publish rediscovers it', async () => {
		await writePiece(target, 'Original')
		await publish()
		const revision = await writePiece(target, 'Retry revision')
		clearEffects()
		const error = new Error('CDN unavailable')
		mocks.cdn.mockRejectedValueOnce(error)
		vi.mocked(Date.now).mockReturnValue(publishedAt + 1000)

		await expect(publish({}, 'failed-archive')).rejects.toBe(error)

		expect(mocks.cdn).toHaveBeenCalledExactlyOnceWith(undefined, ctx)
		expect(mocks.cache).not.toHaveBeenCalled()
		expect((await publicRows(target)).piece).toMatchObject({
			title: 'Retry revision',
			content_hash: null,
			last_published_at: publishedAt,
		})
		expect(
			await ctx.db
				.selectFrom('job_progress')
				.selectAll()
				.where('job_id', '=', 'failed-archive')
				.where('phase', '=', 'publish.complete')
				.execute()
		).toEqual([])
		clearEffects()
		vi.mocked(Date.now).mockReturnValue(publishedAt + 2000)

		const retry = await publish({}, 'fresh-archive')

		expect(retry.pieces).toEqual({ added: [], updated: [target], pruned: [] })
		expect(retry.failedPieces).toEqual([])
		expect(mocks.produce).toHaveBeenCalledOnce()
		expect(mocks.produce.mock.calls[0]![0].file_path).toBe(target)
		expect(mocks.cdn).toHaveBeenCalledExactlyOnceWith(undefined, ctx)
		expect(mocks.cache).toHaveBeenCalledOnce()
		expect((await publicRows(target)).piece).toMatchObject({
			content_hash: hash(revision.rawContent),
			last_published_at: publishedAt + 2000,
		})
	})

	test.each(['delivery', 'cache purge'] as const)(
		'%s failure prevents completion until explicit direct retry',
		async (failure) => {
			await writePiece(target, 'Original')
			await publish({ filePath: target })
			const saved = await writePiece(target, 'Retry revision')
			clearEffects()
			const error = new Error(`${failure} unavailable`)
			const failingStep = failure === 'delivery' ? mocks.copy : mocks.cache
			failingStep.mockRejectedValueOnce(error)
			vi.mocked(Date.now).mockReturnValue(publishedAt + 1000)

			await expect(publish({ filePath: target }, 'failed')).rejects.toBe(error)

			expect((await publicRows(target)).piece).toMatchObject({
				title: 'Retry revision',
				content_hash: null,
				last_published_at: publishedAt,
			})
			expect(
				await ctx.db
					.selectFrom('job_progress')
					.selectAll()
					.where('job_id', '=', 'failed')
					.where('phase', '=', 'publish.complete')
					.execute()
			).toEqual([])
			if (failure === 'delivery') expect(mocks.cache).not.toHaveBeenCalled()
			vi.mocked(Date.now).mockReturnValue(publishedAt + 2000)

			const retry = await publish({ filePath: target }, 'explicit-retry')

			expect(retry.failedPieces).toEqual([])
			expect((await publicRows(target)).piece).toMatchObject({
				content_hash: hash(saved.rawContent),
				last_published_at: publishedAt + 2000,
			})
		}
	)

	test('removing optional source fields clears previously published values and tags', async () => {
		await writePiece(target, 'Original')
		await publish({ filePath: target })
		await ctx.db
			.updateTable('web_pieces')
			.set({
				summary: 'Previous summary',
				keywords: '["previous"]',
				date_consumed: 123,
			})
			.where('file_path', '=', target)
			.execute()
		const rawContent = '---\ntitle: Cleared metadata\n---\n\nNew note.\n'

		await writeFile(path.join(ctx.config.storage.root, target), rawContent)
		await publish({ filePath: target })

		const published = await publicRows(target)
		expect(published.piece).toMatchObject({
			title: 'Cleared metadata',
			summary: null,
			keywords: null,
			date_consumed: null,
			content_hash: hash(rawContent),
		})
		expect(published.tags).toEqual([])
	})

	test('an unindexed direct publication keeps its public identity through a later archive publish', async () => {
		await writePiece(target, 'Unindexed source')
		const result = await publish({ filePath: target })
		expect(result.pieces.added).toEqual([target])
		expect(await coreRows()).toEqual({ items: [], cache: [] })
		const original = (await publicRows(target)).piece
		const saved = await writePiece(target, 'Later indexed save')

		await publish()

		const indexed = await ctx.db
			.selectFrom('pieces_items')
			.select('id')
			.where('file_path', '=', target)
			.executeTakeFirstOrThrow()
		expect(indexed.id).not.toBe(original.id)
		const published = await publicRows(target)
		expect(published.piece).toMatchObject({
			id: original.id,
			slug: original.slug,
			date_added: original.date_added,
			title: 'Later indexed save',
			content_hash: hash(saved.rawContent),
		})
		expect(await ctx.db.selectFrom('web_pieces').selectAll().execute()).toEqual([published.piece])
		expect(published.tags).toEqual([
			expect.objectContaining({
				piece_id: original.id,
				piece_slug: original.slug,
				tag: 'Later indexed save',
			}),
		])
		expect(await ctx.db.selectFrom('web_pieces_tags').selectAll().execute()).toEqual(published.tags)
	})

	test('invalid saved Markdown is rejected before public writes', async () => {
		await writePiece(target, 'Original')
		await publish({ filePath: target })
		const before = await publicRows(target)
		const coreBefore = await coreRows()
		clearEffects()

		await writeFile(
			path.join(ctx.config.storage.root, target),
			'---\ntags: [Invalid]\n---\n\nMissing required title.\n'
		)

		await expect(publish({ filePath: target })).rejects.toThrow(/title/)

		expect(await publicRows(target)).toEqual(before)
		expect(await coreRows()).toEqual(coreBefore)
		expect(mocks.produce).not.toHaveBeenCalled()
		expect(mocks.copy).not.toHaveBeenCalled()
		expect(mocks.cache).not.toHaveBeenCalled()
	})

	test('a save during rendering stays pending after the source read by the worker completes', async () => {
		const sourceB = await writePiece(target, 'Source B')
		await luzzleSyncStep.run(undefined, ctx)
		let savedC: Awaited<ReturnType<typeof writePiece>> | undefined
		const render = mocks.produce.getMockImplementation()!
		mocks.produce.mockImplementationOnce(async (...args) => {
			savedC = await writePiece(target, 'Saved C')
			await luzzleSyncStep.run(undefined, ctx)
			return render(...args)
		})

		await publish({ filePath: target })

		expect((await publicRows(target)).piece).toMatchObject({
			title: 'Source B',
			content_hash: hash(sourceB.rawContent),
			last_published_at: publishedAt,
		})
		expect((await coreRows()).cache.find((row) => row.file_path === target)?.content_hash).toBe(
			hash(savedC!.rawContent)
		)
		expect(await getPendingPublication(ctx.db, ctx.config)).toEqual({
			pieces: [{ filePath: target, contentHash: hash(savedC!.rawContent) }],
			diff: { added: [], updated: [target], pruned: [] },
		})
	})
})
