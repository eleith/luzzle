import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { migrate, type PiecesDiff } from '@luzzle/core'
import { validateConfig } from '@luzzle/web.config'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import type { PublishPayload, PublishResult } from '@luzzle/web.jobs'
import { publishSpec } from '@luzzle/web.jobs/specs'
import { OpenWorkflow, type Workflow } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { completed, type StepResult } from '../core/step.js'
import { RcloneClient } from '../services/rclone.js'
import { createOpenWorkflowLogger } from '../services/logger.js'
import { setWorkerContext, type WorkerContext } from '../services/context.js'
import { getPendingPublication } from '../services/publication.js'
import { luzzleSyncStep } from '../steps/luzzle-sync.js'
import { luzzleAuditStep } from '../steps/luzzle-audit.js'
import { publishPrepareStep, type PublishPlan } from '../steps/publish-prepare.js'
import { webSyncStep } from '../steps/web-sync/index.js'
import type { AssetsGenerateInput, AssetsGenerateResult } from '../steps/assets-generate.js'
import { registerPublishWorkflow } from './publish.js'
import { emptyPiecesDiff } from './pieces-diff.js'

type PublishWorkflow = Workflow<PublishPayload, PublishResult, PublishPayload>['fn']
type WorkflowStep = Parameters<PublishWorkflow>[0]['step']
type AssetsRunner = (
	input: AssetsGenerateInput,
	ctx: WorkerContext
) => Promise<StepResult<AssetsGenerateResult>>

const mocks = vi.hoisted(() => ({
	implementWorkflow: vi.fn<(spec: typeof publishSpec, fn: PublishWorkflow) => void>(),
	assets: vi.fn<AssetsRunner>(),
	cdn: vi.fn<() => Promise<StepResult<void>>>(),
	cache: vi.fn<() => Promise<StepResult<void>>>(),
}))

vi.mock('@luzzle/web.jobs', () => ({
	getOpenWorkflow: () => ({ implementWorkflow: mocks.implementWorkflow }),
}))
vi.mock('../steps/assets-generate.js', () => ({
	assetsGenerateStep: { name: 'assets.generate', run: mocks.assets },
}))
vi.mock('../steps/cdn-sync.js', () => ({
	cdnSyncStep: { name: 'cdn.sync', run: mocks.cdn },
}))
vi.mock('../steps/cache-purge.js', () => ({
	cachePurgeStep: { name: 'cache.purge', run: mocks.cache },
}))

const healthy = 'healthy.books.md'
const broken = 'broken.books.md'
const batch = [broken, healthy]
const completionTime = 1_900_000_000_000

function valueOf<T>(result: StepResult<T>): T {
	expect(result.status).toBe('completed')
	if (result.status !== 'completed') throw new Error('Expected a completed step')
	return result.value
}

describe('publish hash recovery with a real archive and SQLite', () => {
	let directory: string
	let ctx: WorkerContext
	let workflow: PublishWorkflow

	beforeEach(async () => {
		vi.resetAllMocks()
		vi.spyOn(Date, 'now').mockReturnValue(completionTime)
		mocks.assets.mockResolvedValue(completed({ failedPieces: [] }))
		mocks.cdn.mockResolvedValue(completed(undefined))
		mocks.cache.mockResolvedValue(completed(undefined))

		directory = await mkdtemp(path.join(tmpdir(), 'luzzle-publish-recovery-'))
		const archive = path.join(directory, 'archive')
		await mkdir(path.join(archive, '.luzzle', 'schemas'), { recursive: true })
		await writeFile(
			path.join(archive, '.luzzle', 'schemas', 'books.json'),
			JSON.stringify({
				type: 'object',
				title: 'books',
				properties: { title: { type: 'string' } },
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
				assets: { salt: 'recovery-test' },
				pieces: [{ type: 'books', fields: { title: 'title', date_consumed: 'date_consumed' } }],
			},
			{}
		)
		const db = createAppDb(path.join(directory, 'index.sqlite'))
		expect((await migrate(db)).error).toBeUndefined()
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
		const [spec, callback] = mocks.implementWorkflow.mock.calls[0]!
		expect(spec).toBe(publishSpec)
		workflow = callback
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		await ctx?.db.destroy()
		await rm(directory, { recursive: true, force: true })
	})

	async function writePiece(filePath: string, title: string) {
		const target = path.join(ctx.config.storage.root, filePath)
		await writeFile(target, `---\ntitle: ${title}\n---\n\nMarkdown for ${title}.\n`)
		await utimes(target, new Date(), new Date(Date.now() + 10_000))
	}

	// Each invocation is a fresh run with no saved checkpoints.
	// The optional boundary models losing a phase result, not an SDK process crash.
	async function publish(
		jobId: string,
		afterPhase?: (name: string, value: unknown) => Promise<void>
	) {
		const phaseResults = new Map<string, unknown>()
		const step: WorkflowStep = {
			run: async <Output>(
				{ name }: { name: string },
				fn: () => Promise<Output | undefined> | Output | undefined
			): Promise<Output> => {
				const value = await fn()
				await afterPhase?.(name, value)
				phaseResults.set(name, value)
				return value as Output
			},
		} as WorkflowStep
		const result = await workflow({
			input: {},
			step,
			version: null,
			run: {
				id: jobId,
				workflowName: publishSpec.name,
				createdAt: new Date(),
				startedAt: null,
			},
		})
		return { result, phaseResults }
	}

	// Real SDK queue/checkpoint storage; only external delivery and transforms are stubbed.
	async function withQueue(
		run: (
			client: OpenWorkflow,
			worker: ReturnType<OpenWorkflow['newWorker']>,
			backend: BackendSqlite
		) => Promise<void>
	) {
		const backend = BackendSqlite.connect(path.join(directory, 'queue.sqlite'))
		const client = new OpenWorkflow({ backend, logger: createOpenWorkflowLogger(ctx.logger) })
		client.implementWorkflow(publishSpec, workflow)
		const worker = client.newWorker({ concurrency: 1 })
		try {
			await run(client, worker, backend)
		} finally {
			await worker.stop()
			await backend.stop()
		}
	}

	async function finishQueued(
		worker: ReturnType<OpenWorkflow['newWorker']>,
		backend: BackendSqlite,
		id: string
	) {
		await vi.waitFor(
			async () => {
				await worker.tick()
				expect((await backend.getWorkflowRun({ workflowRunId: id }))?.status).toBe('completed')
			},
			{ timeout: 5000 }
		)
		const run = await backend.getWorkflowRun({ workflowRunId: id })
		return run!.output as unknown as PublishResult
	}

	async function publicRows(filePath: string) {
		return {
			pieces: await ctx.db
				.selectFrom('web_pieces')
				.selectAll()
				.where('file_path', '=', filePath)
				.execute(),
			assets: await ctx.db
				.selectFrom('web_pieces_assets')
				.selectAll()
				.where('piece_file_path', '=', filePath)
				.execute(),
		}
	}

	async function seedAsset(filePath: string) {
		const piece = await ctx.db
			.selectFrom('web_pieces')
			.select('key')
			.where('file_path', '=', filePath)
			.executeTakeFirstOrThrow()
		await ctx.db
			.insertInto('web_pieces_assets')
			.values({
				piece_file_path: filePath,
				piece_key: piece.key,
				piece_asset_path: '.assets/cover.jpg',
				asset_key: `${piece.key}-cover`,
				transformation: 'image',
				asset_path: `${piece.key}/cover.webp`,
				mime_type: 'image/webp',
			})
			.execute()
	}

	async function hashes(filePath: string) {
		const indexed = await ctx.db
			.selectFrom('pieces_cache')
			.select('content_hash')
			.where('file_path', '=', filePath)
			.executeTakeFirstOrThrow()
		const published = await ctx.db
			.selectFrom('web_pieces')
			.select(['content_hash', 'title', 'last_published_at'])
			.where('file_path', '=', filePath)
			.executeTakeFirstOrThrow()
		return {
			indexed: indexed.content_hash,
			published: published.content_hash,
			title: published.title,
			lastPublishedAt: published.last_published_at,
		}
	}

	async function audit(): Promise<PiecesDiff> {
		return valueOf(await luzzleAuditStep.run(undefined, ctx))
	}

	test.each(['added', 'updated'] as const)(
		'queued selection publishes only the pending %s target, preserving unselected rows and pruning globally',
		async (action) => {
			const removed = 'removed.books.md'
			const unchanged = 'unchanged.books.md'
			if (action === 'updated') await writePiece(healthy, 'Original selected')
			await writePiece(broken, 'Original unselected')
			await writePiece(removed, 'Removed globally')
			await writePiece(unchanged, 'Unchanged')
			await withQueue(async (client, worker, backend) => {
				const baseline = await client.runWorkflow(publishSpec, {})
				await finishQueued(worker, backend, baseline.workflowRun.id)
				await seedAsset(broken)
				await seedAsset(removed)
				const unselectedBefore = await publicRows(broken)
				const unchangedBefore = await publicRows(unchanged)
				await writePiece(healthy, 'Selected current')
				await writePiece(broken, 'Unselected current')
				await writePiece('new-unselected.books.md', 'New unselected')
				await rm(path.join(ctx.config.storage.root, removed))
				mocks.assets.mockClear()
				mocks.cdn.mockClear()
				mocks.cache.mockClear()

				const selected = await client.runWorkflow(publishSpec, {
					filePaths: [healthy, healthy, unchanged, removed, 'missing.books.md'],
				})
				const result = await finishQueued(worker, backend, selected.workflowRun.id)

				expect(result).toEqual({
					schemas: emptyPiecesDiff().schemas,
					pieces: {
						added: action === 'added' ? [healthy] : [],
						updated: action === 'updated' ? [healthy] : [],
						pruned: [removed],
					},
					failedPieces: [],
				})
				expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: [healthy] }, ctx)
				expect(mocks.cdn).toHaveBeenCalledOnce()
				expect(mocks.cache).toHaveBeenCalledOnce()
				expect(await publicRows(broken)).toEqual(unselectedBefore)
				expect(await publicRows(unchanged)).toEqual(unchangedBefore)
				expect(await publicRows(removed)).toEqual({ pieces: [], assets: [] })
				expect(await publicRows('new-unselected.books.md')).toEqual({ pieces: [], assets: [] })
				const state = await hashes(healthy)
				expect(state.published).toBe(state.indexed)
				expect(state.title).toBe('Selected current')
				expect((await audit()).pieces).toEqual({
					added: ['new-unselected.books.md'],
					updated: [broken],
					pruned: [],
				})
			})
		}
	)

	test.each([false, true])(
		'queued explicit empty selection keeps schema housekeeping and global removals (%s)',
		async (removePiece) => {
			const removed = 'removed.books.md'
			for (const filePath of [healthy, broken, removed]) {
				await writePiece(filePath, `Original ${filePath}`)
			}
			await publish('baseline-empty-selection')
			await seedAsset(broken)
			await seedAsset(removed)
			const healthyBefore = await publicRows(healthy)
			const brokenBefore = await publicRows(broken)
			const removedBefore = await publicRows(removed)
			await writePiece(healthy, 'Pending selected none')
			await writePiece(broken, 'Pending unselected')
			if (removePiece) await rm(path.join(ctx.config.storage.root, removed))
			await writeFile(
				path.join(ctx.config.storage.root, '.luzzle', 'schemas', 'books.json'),
				JSON.stringify({
					type: 'object',
					title: 'books',
					description: 'Updated globally',
					properties: { title: { type: 'string' } },
					required: ['title'],
					additionalProperties: true,
				})
			)
			mocks.assets.mockClear()
			mocks.cdn.mockClear()
			mocks.cache.mockClear()

			await withQueue(async (client, worker, backend) => {
				const empty = await client.runWorkflow(publishSpec, { filePaths: [] })
				const result = await finishQueued(worker, backend, empty.workflowRun.id)
				expect(result).toEqual({
					schemas: { added: [], updated: ['books'], pruned: [] },
					pieces: { added: [], updated: [], pruned: removePiece ? [removed] : [] },
					failedPieces: [],
				})
				expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: [] }, ctx)
				expect(mocks.cdn).toHaveBeenCalledOnce()
				expect(mocks.cache).toHaveBeenCalledOnce()
				expect(await publicRows(healthy)).toEqual(healthyBefore)
				expect(await publicRows(broken)).toEqual(brokenBefore)
				expect(await publicRows(removed)).toEqual(
					removePiece ? { pieces: [], assets: [] } : removedBefore
				)
				expect((await audit()).pieces).toEqual({ added: [], updated: batch, pruned: [] })
			})
		}
	)

	test('queued interrupted delivery replays the captured selected plan without widening membership or hashes', async () => {
		const late = 'late.books.md'
		await writePiece(healthy, 'Original selected')
		await writePiece(broken, 'Original unselected')
		await publish('baseline-interruption')
		await seedAsset(broken)
		const unselectedBefore = await publicRows(broken)
		await writePiece(healthy, 'Selected revision two')
		await writePiece(broken, 'Unselected revision two')
		mocks.assets.mockClear()
		mocks.cache.mockRejectedValueOnce(new Error('interrupted delivery'))

		await withQueue(async (client, worker, backend) => {
			const handle = await client.runWorkflow(publishSpec, { filePaths: [healthy, late] })
			const id = handle.workflowRun.id
			await worker.tick()
			await vi.waitFor(
				async () => {
					const run = await backend.getWorkflowRun({ workflowRunId: id })
					expect(run?.status).toBe('pending')
					expect(run?.attempts).toBe(1)
				},
				{ timeout: 5000 }
			)
			const attempts = (await backend.listStepAttempts({ workflowRunId: id })).data
			const plan = attempts.find((attempt) => attempt.stepName === 'publish.prepare')!
				.output as unknown as PublishPlan
			expect(plan.pieces.map((piece) => piece.filePath)).toEqual([healthy])
			const capturedHash = plan.pieces[0]!.contentHash
			await writePiece(healthy, 'Selected revision three')
			await writePiece(late, 'Selected but not pending when prepared')
			await luzzleSyncStep.run(undefined, ctx)

			const result = await finishQueued(worker, backend, id)

			expect(result).toEqual({ ...plan.summary, failedPieces: [] })
			expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: [healthy] }, ctx)
			expect(await publicRows(broken)).toEqual(unselectedBefore)
			expect(await publicRows(late)).toEqual({ pieces: [], assets: [] })
			const state = await hashes(healthy)
			expect(state.published).toBe(capturedHash)
			expect(state.indexed).not.toBe(capturedHash)
			expect(state.title).toBe('Selected revision two')
			const retried = (await backend.listStepAttempts({ workflowRunId: id })).data
			expect(retried.filter((attempt) => attempt.stepName === 'publish.prepare')).toHaveLength(1)
			expect(retried.find((attempt) => attempt.stepName === 'publish.prepare')!.output).toEqual(plan)
			expect(retried.filter((attempt) => attempt.stepName === 'cache.purge')).toHaveLength(2)
			expect((await audit()).pieces).toEqual({ added: [late], updated: batch, pruned: [] })
		})
	})

	test('queued partial-failure rerun retains selected hashes and leaves unselected pending work untouched', async () => {
		const unselected = 'unselected.books.md'
		const late = 'late.books.md'
		for (const filePath of [...batch, unselected]) await writePiece(filePath, `Original ${filePath}`)
		await publish('baseline-partial-selection')
		await seedAsset(unselected)
		const unselectedBefore = await publicRows(unselected)
		for (const filePath of [...batch, unselected]) await writePiece(filePath, `Changed ${filePath}`)
		const failedPieces = [{ filePath: broken, message: 'selected transform failed' }]
		mocks.assets.mockClear()
		mocks.assets.mockResolvedValueOnce(completed({ failedPieces }))

		await withQueue(async (client, worker, backend) => {
			const partial = await client.runWorkflow(publishSpec, { filePaths: [...batch, late] })
			const partialResult = await finishQueued(worker, backend, partial.workflowRun.id)
			expect(partialResult.failedPieces).toEqual(failedPieces)
			expect((await hashes(healthy)).published).toBe((await hashes(healthy)).indexed)
			expect((await hashes(broken)).published).toBeNull()
			expect(await publicRows(unselected)).toEqual(unselectedBefore)
			const attempts = (
				await backend.listStepAttempts({ workflowRunId: partial.workflowRun.id })
			).data
			const plan = attempts.find((attempt) => attempt.stepName === 'publish.prepare')!
				.output as unknown as PublishPlan
			expect(plan.pieces.map((piece) => piece.filePath)).toEqual(batch)
			await writePiece(healthy, 'Newer than captured selected hash')
			await writePiece(late, 'Late selected addition')
			await luzzleSyncStep.run(undefined, ctx)
			mocks.assets.mockClear()

			const retry = await client.rerunWorkflowRun(partial.workflowRun.id, {
				fromStep: 'assets.generate',
			})
			const result = await finishQueued(worker, backend, retry.id)

			expect(result).toEqual({ ...plan.summary, failedPieces: [] })
			expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: batch }, ctx)
			for (const piece of plan.pieces) {
				expect((await hashes(piece.filePath)).published).toBe(piece.contentHash)
			}
			expect((await hashes(healthy)).indexed).not.toBe((await hashes(healthy)).published)
			expect(await publicRows(unselected)).toEqual(unselectedBefore)
			expect(await publicRows(late)).toEqual({ pieces: [], assets: [] })
			const retried = (await backend.listStepAttempts({ workflowRunId: retry.id })).data
			expect(retried.find((attempt) => attempt.stepName === 'publish.prepare')!.output).toEqual(plan)
			expect((await audit()).pieces).toEqual({
				added: [late],
				updated: [healthy, unselected],
				pruned: [],
			})
		})
	})

	test('a fresh publish rediscovers new and updated pieces after the sync result is discarded', async () => {
		await writePiece(healthy, 'Original')
		await publish('baseline')
		const original = await hashes(healthy)
		await writePiece(healthy, 'Changed')
		await writePiece(broken, 'New')

		const interruption = new Error('lost sync result before checkpoint')
		await expect(
			publish('interrupted', async (name, value) => {
				if (name !== 'luzzle.sync') return
				expect(value).toMatchObject({ pieces: { added: [broken], updated: [healthy] } })
				throw interruption
			})
		).rejects.toBe(interruption)
		expect(await hashes(healthy)).toMatchObject({
			published: original.published,
			title: 'Original',
		})
		expect(await ctx.db.selectFrom('web_pieces').select('file_path').execute()).toEqual([
			{ file_path: healthy },
		])
		expect((await audit()).pieces).toEqual({ added: [broken], updated: [healthy], pruned: [] })

		mocks.assets.mockClear()
		const recovered = await publish('fresh-recovery')
		expect(recovered.phaseResults.get('luzzle.sync')).toEqual(emptyPiecesDiff())
		expect([...recovered.phaseResults.keys()]).toEqual([
			'luzzle.sync',
			'publish.prepare',
			'web.sync',
			'assets.generate',
			'cdn.sync',
			'cache.purge',
			'publish.complete',
		])
		expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: batch }, ctx)
		expect(recovered.result).toEqual({
			schemas: emptyPiecesDiff().schemas,
			pieces: { added: [broken], updated: [healthy], pruned: [] },
			failedPieces: [],
		})
		for (const filePath of batch) {
			const state = await hashes(filePath)
			expect(state.published).toBe(state.indexed)
		}
		expect(await audit()).toEqual(emptyPiecesDiff())
	})

	test('metadata sync alone never records publication success for either new or existing rows', async () => {
		await writePiece(healthy, 'Original')
		const initialDiff = valueOf(await luzzleSyncStep.run(undefined, ctx))
		const initialPlan = valueOf(await publishPrepareStep.run({ summary: initialDiff }, ctx))
		await webSyncStep.run({ filePaths: initialPlan.pieces.map((piece) => piece.filePath) }, ctx)
		expect(await hashes(healthy)).toMatchObject({ published: null, lastPublishedAt: null })
		expect((await getPendingPublication(ctx.db, ctx.config)).pieces).toEqual(initialPlan.pieces)

		await publish('baseline')
		const original = await hashes(healthy)
		await writePiece(healthy, 'Metadata changed')
		const diff = valueOf(await luzzleSyncStep.run(undefined, ctx))
		const plan = valueOf(await publishPrepareStep.run({ summary: diff }, ctx))
		await webSyncStep.run({ filePaths: plan.pieces.map((piece) => piece.filePath) }, ctx)
		const state = await hashes(healthy)
		expect(state.title).toBe('Metadata changed')
		expect(state.indexed).not.toBe(original.indexed)
		expect(state.published).toBeNull()
		expect(original.lastPublishedAt).toBe(completionTime)
		expect(state.lastPublishedAt).toBe(original.lastPublishedAt)
		expect((await getPendingPublication(ctx.db, ctx.config)).pieces).toEqual(plan.pieces)
		expect((await audit()).pieces).toEqual({ added: [], updated: [healthy], pruned: [] })
	})

	test('partial transform failure completes healthy siblings and a fresh run targets only the failure', async () => {
		await writePiece(healthy, 'Original healthy')
		await writePiece(broken, 'Original broken')
		await publish('baseline')
		const oldBroken = await hashes(broken)
		vi.mocked(Date.now).mockReturnValue(completionTime + 1000)
		await writePiece(healthy, 'Changed healthy')
		await writePiece(broken, 'Changed broken')
		const failedPieces = [{ filePath: broken, message: 'markdown transform failed' }]
		mocks.assets.mockResolvedValueOnce(completed({ failedPieces }))

		const partial = await publish('partial')
		expect(partial.result.failedPieces).toEqual(failedPieces)
		const healthyState = await hashes(healthy)
		expect(healthyState.published).toBe(healthyState.indexed)
		expect(healthyState.lastPublishedAt).toBe(completionTime + 1000)
		const brokenState = await hashes(broken)
		expect(brokenState.title).toBe('Changed broken')
		expect(oldBroken.published).toBe(oldBroken.indexed)
		expect(brokenState.published).toBeNull()
		expect(brokenState.published).not.toBe(brokenState.indexed)
		expect(oldBroken.lastPublishedAt).toBe(completionTime)
		expect(brokenState.lastPublishedAt).toBe(oldBroken.lastPublishedAt)
		expect((await audit()).pieces).toEqual({ added: [], updated: [broken], pruned: [] })

		mocks.assets.mockClear()
		vi.mocked(Date.now).mockReturnValue(completionTime + 2000)
		const retry = await publish('fresh-retry')
		expect(retry.phaseResults.get('luzzle.sync')).toEqual(emptyPiecesDiff())
		expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: [broken] }, ctx)
		expect(retry.result.pieces).toEqual({ added: [], updated: [broken], pruned: [] })
		expect(retry.result.failedPieces).toEqual([])
		expect(await hashes(broken)).toMatchObject({
			published: brokenState.indexed,
			lastPublishedAt: completionTime + 2000,
		})
		expect((await hashes(healthy)).lastPublishedAt).toBe(healthyState.lastPublishedAt)
		expect(await audit()).toEqual(emptyPiecesDiff())
	})

	test.each(['cdn.sync', 'cache.purge'])(
		'%s failure leaves the entire batch pending for a fresh publish',
		async (phase) => {
			await writePiece(healthy, 'Original healthy')
			await writePiece(broken, 'Original broken')
			await publish('baseline')
			const originalHealthy = await hashes(healthy)
			const originalBroken = await hashes(broken)
			vi.mocked(Date.now).mockReturnValue(completionTime + 1000)
			await writePiece(healthy, 'Changed healthy')
			await writePiece(broken, 'Changed broken')
			const error = new Error(`${phase} unavailable`)
			if (phase === 'cdn.sync') mocks.cdn.mockRejectedValueOnce(error)
			if (phase === 'cache.purge') mocks.cache.mockRejectedValueOnce(error)

			await expect(publish('global-failure')).rejects.toBe(error)
			expect(originalHealthy.published).toBe(originalHealthy.indexed)
			expect(originalBroken.published).toBe(originalBroken.indexed)
			expect(await hashes(healthy)).toMatchObject({
				published: null,
				lastPublishedAt: originalHealthy.lastPublishedAt,
			})
			expect(await hashes(broken)).toMatchObject({
				published: null,
				lastPublishedAt: originalBroken.lastPublishedAt,
			})
			const completion = await ctx.db
				.selectFrom('job_progress')
				.selectAll()
				.where('job_id', '=', 'global-failure')
				.where('phase', '=', 'publish.complete')
				.execute()
			expect(completion).toEqual([])
			expect((await audit()).pieces).toEqual({ added: [], updated: batch, pruned: [] })

			mocks.assets.mockClear()
			vi.mocked(Date.now).mockReturnValue(completionTime + 2000)
			const retry = await publish('fresh-global-retry')
			expect(retry.phaseResults.get('luzzle.sync')).toEqual(emptyPiecesDiff())
			expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: batch }, ctx)
			expect(retry.result.pieces).toEqual({ added: [], updated: batch, pruned: [] })
			for (const filePath of batch) {
				const state = await hashes(filePath)
				expect(state.published).toBe(state.indexed)
				expect(state.lastPublishedAt).toBe(completionTime + 2000)
			}
			expect(await audit()).toEqual(emptyPiecesDiff())
		}
	)

	test('completion records the captured revision, leaving a newer indexed revision pending', async () => {
		await writePiece(healthy, 'Revision one')
		await publish('baseline')
		await writePiece(healthy, 'Revision two')
		let processedHash: string | undefined
		mocks.assets.mockImplementationOnce(async ({ filePaths }) => {
			expect(filePaths).toEqual([healthy])
			processedHash = (await hashes(healthy)).indexed
			await writePiece(healthy, 'Revision three')
			expect(valueOf(await luzzleSyncStep.run(undefined, ctx)).pieces.updated).toEqual([healthy])
			return completed({ failedPieces: [] })
		})

		const completedRun = await publish('revision-two')
		expect(completedRun.phaseResults.get('publish.prepare')).toMatchObject({
			pieces: [{ filePath: healthy, contentHash: processedHash }],
		})
		const state = await hashes(healthy)
		expect(processedHash).toBeTypeOf('string')
		expect(state.published).toBe(processedHash)
		expect(state.indexed).not.toBe(processedHash)
		expect(state.title).toBe('Revision two')
		expect((await audit()).pieces).toEqual({ added: [], updated: [healthy], pruned: [] })

		mocks.assets.mockClear()
		const retry = await publish('fresh-revision-three')
		expect(retry.phaseResults.get('luzzle.sync')).toEqual(emptyPiecesDiff())
		expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: [healthy] }, ctx)
		expect(await hashes(healthy)).toEqual({
			indexed: state.indexed,
			published: state.indexed,
			title: 'Revision three',
			lastPublishedAt: completionTime,
		})
		expect(await audit()).toEqual(emptyPiecesDiff())
	})

	test.each([false, true])(
		'reverted Markdown stays pending after a failed publication (already indexed: %s)',
		async (alreadyIndexed) => {
			await writePiece(healthy, 'Revision A')
			await publish('baseline-A')
			const original = await hashes(healthy)
			await writePiece(healthy, 'Revision B')
			mocks.assets.mockResolvedValueOnce(
				completed({
					failedPieces: [{ filePath: healthy, message: 'image failed' }],
				})
			)
			await publish('failed-B')
			expect(await hashes(healthy)).toMatchObject({ title: 'Revision B', published: null })

			await writePiece(healthy, 'Revision A')
			if (alreadyIndexed) await luzzleSyncStep.run(undefined, ctx)
			expect((await audit()).pieces.updated).toEqual([healthy])

			mocks.assets.mockClear()
			await publish('restore-A')
			expect(mocks.assets).toHaveBeenCalledExactlyOnceWith({ filePaths: [healthy] }, ctx)
			expect(await hashes(healthy)).toEqual({
				indexed: original.indexed,
				published: original.indexed,
				title: 'Revision A',
				lastPublishedAt: completionTime,
			})
			expect(await audit()).toEqual(emptyPiecesDiff())
		}
	)

	test('a read-only audit unions unsynced source changes with pending indexed publication', async () => {
		await writePiece(healthy, 'Already indexed')
		valueOf(await luzzleSyncStep.run(undefined, ctx))
		await writePiece(broken, 'Not yet indexed')
		const before = await ctx.db.selectFrom('pieces_cache').selectAll().execute()
		const diff = await audit()
		expect([...diff.pieces.added].sort()).toEqual(batch)
		expect(diff.pieces.updated).toEqual([])
		expect(await ctx.db.selectFrom('pieces_cache').selectAll().execute()).toEqual(before)
		expect(await ctx.db.selectFrom('web_pieces').selectAll().execute()).toEqual([])
	})
})
