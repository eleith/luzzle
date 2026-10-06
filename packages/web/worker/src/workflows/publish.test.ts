import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { Workflow } from 'openworkflow'
import type { PiecesDiff } from '@luzzle/core'
import type { PublishPayload, PublishResult } from '@luzzle/web.jobs'
import { publishSpec } from '@luzzle/web.jobs/specs'
import type { StepResult } from '../core/step.js'
import type { WorkerContext } from '../services/context.js'
import { registerPublishWorkflow } from './publish.js'
import { emptyPiecesDiff } from './pieces-diff.js'

type PublishWorkflow = Workflow<PublishPayload, PublishResult, PublishPayload>['fn']
type WorkflowStep = Parameters<PublishWorkflow>[0]['step']

const mocks = vi.hoisted(() => {
	const jobStep = (name: string) => ({
		name,
		run: vi.fn<(input: unknown) => Promise<StepResult<unknown>>>(),
	})
	return {
		implementWorkflow: vi.fn<(spec: typeof publishSpec, fn: PublishWorkflow) => void>(),
		logger: { info: vi.fn(), warn: vi.fn() },
		progress: { start: vi.fn(), complete: vi.fn(), skip: vi.fn(), fail: vi.fn() },
		archiveSync: jobStep('archive.sync'),
		luzzleSync: jobStep('luzzle.sync'),
		webSync: jobStep('web.sync'),
		assetsGenerate: jobStep('assets.generate'),
		cdnSync: jobStep('cdn.sync'),
		cachePurge: jobStep('cache.purge'),
	}
})

vi.mock('@luzzle/web.jobs', () => ({
	getOpenWorkflow: () => ({ implementWorkflow: mocks.implementWorkflow }),
}))
vi.mock('../services/context.js', () => ({
	getWorkerContext: () => ({ logger: mocks.logger, db: {} }),
	createPhaseContext: (ctx: WorkerContext) => ctx,
}))
vi.mock('../core/job-progress.js', () => ({
	JobProgress: class {
		constructor() {
			return mocks.progress
		}
	},
}))
vi.mock('../steps/archive-sync.js', () => ({ archiveSyncStep: mocks.archiveSync }))
vi.mock('../steps/luzzle-sync.js', () => ({ luzzleSyncStep: mocks.luzzleSync }))
vi.mock('../steps/web-sync/index.js', () => ({ webSyncStep: mocks.webSync }))
vi.mock('../steps/assets-generate.js', () => ({ assetsGenerateStep: mocks.assetsGenerate }))
vi.mock('../steps/cdn-sync.js', () => ({ cdnSyncStep: mocks.cdnSync }))
vi.mock('../steps/cache-purge.js', () => ({ cachePurgeStep: mocks.cachePurge }))

const summary: PiecesDiff = {
	schemas: { added: ['books'], updated: [], pruned: ['old'] },
	pieces: {
		added: ['healthy.books.md'],
		updated: ['broken.books.md'],
		pruned: ['removed.books.md'],
	},
}

// Exercise the app's registered callback and real runProgressPhase helper, without
// the SDK's private registry or any filesystem/transform/CDN side effects.
async function runPublish(input: PublishPayload = {}, checkpoints = new Map<string, unknown>()) {
	registerPublishWorkflow()
	expect(mocks.implementWorkflow).toHaveBeenCalledOnce()
	const [spec, callback] = mocks.implementWorkflow.mock.calls[0]!
	expect(spec).toBe(publishSpec)

	const run = vi.fn(
		async <Output>(
			{ name }: { name: string },
			fn: () => Promise<Output | undefined> | Output | undefined
		): Promise<Output> => {
			if (checkpoints.has(name)) return checkpoints.get(name) as Output
			return (await fn()) as Output
		}
	)
	const result = await callback({
		input,
		step: { run } as unknown as WorkflowStep,
		version: null,
		run: {
			id: 'publish-1',
			workflowName: publishSpec.name,
			createdAt: new Date(),
			startedAt: null,
		},
	})
	return { result, phases: run.mock.calls.map(([config]) => config.name) }
}

function expectHealthyPhasesComplete() {
	expect(mocks.cdnSync.run).toHaveBeenCalledOnce()
	expect(mocks.cachePurge.run).toHaveBeenCalledOnce()
	expect(mocks.progress.complete).toHaveBeenCalledWith('publish-1', 'cdn.sync')
	expect(mocks.progress.complete).toHaveBeenCalledWith('publish-1', 'cache.purge')
	expect(mocks.progress.fail).not.toHaveBeenCalled()
}

function expectNormalCompletion() {
	expect(mocks.logger.info).toHaveBeenCalledWith('openworkflow publish complete', {
		jobId: 'publish-1',
	})
	expect(mocks.logger.warn).not.toHaveBeenCalled()
}

describe('workflows/publish', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		for (const jobStep of [
			mocks.archiveSync,
			mocks.luzzleSync,
			mocks.webSync,
			mocks.assetsGenerate,
			mocks.cdnSync,
			mocks.cachePurge,
		]) {
			jobStep.run.mockResolvedValue({ status: 'completed', value: undefined })
		}
		mocks.luzzleSync.run.mockResolvedValue({ status: 'completed', value: summary })
		mocks.assetsGenerate.run.mockResolvedValue({ status: 'completed', value: { failedPieces: [] } })
	})

	test('reports failed pieces in JSON while publishing healthy siblings and retaining the source diff', async () => {
		const failedPieces = [{ filePath: 'broken.books.md', message: 'markdown transform failed' }]
		mocks.assetsGenerate.run.mockResolvedValue({ status: 'completed', value: { failedPieces } })

		const { result, phases } = await runPublish()

		expect(phases).toEqual([
			'luzzle.sync',
			'web.sync',
			'assets.generate',
			'cdn.sync',
			'cache.purge',
		])
		expect(mocks.webSync.run).toHaveBeenCalledWith(
			{ filePaths: ['healthy.books.md', 'broken.books.md'] },
			expect.anything()
		)
		expect(mocks.assetsGenerate.run).toHaveBeenCalledWith(
			{ filePaths: ['healthy.books.md', 'broken.books.md'] },
			expect.anything()
		)
		expect(JSON.parse(JSON.stringify(result))).toEqual({ ...summary, failedPieces })
		expect(result.pieces.updated).toContain('broken.books.md')
		expect(summary).not.toHaveProperty('failedPieces')
		expect(mocks.progress.complete).toHaveBeenCalledWith('publish-1', 'assets.generate')
		expectHealthyPhasesComplete()
		expect(mocks.logger.warn).toHaveBeenCalledWith('openworkflow publish complete with failures', {
			jobId: 'publish-1',
			failedCount: 1,
		})
		expect(mocks.logger.info).not.toHaveBeenCalledWith(
			'openworkflow publish complete',
			expect.anything()
		)
	})

	test.each(['cdn.sync', 'cache.purge'])(
		'keeps a global %s rejection as a real publish failure',
		async (phase) => {
			const error = new Error(`${phase} failed`)
			const jobStep = phase === 'cdn.sync' ? mocks.cdnSync : mocks.cachePurge
			jobStep.run.mockRejectedValueOnce(error)
			await expect(runPublish()).rejects.toBe(error)
			expect(mocks.progress.fail).toHaveBeenCalledWith('publish-1', phase, error)
			if (phase === 'cdn.sync') expect(mocks.cachePurge.run).not.toHaveBeenCalled()
			expect(mocks.logger.info).not.toHaveBeenCalledWith('openworkflow publish complete', expect.anything())
			expect(mocks.logger.warn).not.toHaveBeenCalled()
		}
	)

	test('returns successful reports and keeps the normal completion log', async () => {
		const { result } = await runPublish()
		expect(result).toEqual({ ...summary, failedPieces: [] })
		expect(mocks.archiveSync.run).not.toHaveBeenCalled()
		expectHealthyPhasesComplete()
		expectNormalCompletion()
	})

	test('runs optional archive bisync before the remaining publish phases', async () => {
		const { result, phases } = await runPublish({ bisync: true })
		expect(phases).toEqual([
			'archive.sync',
			'luzzle.sync',
			'web.sync',
			'assets.generate',
			'cdn.sync',
			'cache.purge',
		])
		expect(result).toEqual({ ...summary, failedPieces: [] })
		expectHealthyPhasesComplete()
		expectNormalCompletion()
	})

	test('returns an empty diff and report for an empty/older luzzle checkpoint', async () => {
		const { result } = await runPublish({}, new Map([['luzzle.sync', undefined]]))
		expect(result).toEqual({ ...emptyPiecesDiff(), failedPieces: [] })
		expect(mocks.luzzleSync.run).not.toHaveBeenCalled()
		expect(mocks.webSync.run).toHaveBeenCalledWith({ filePaths: [] }, expect.anything())
		expect(mocks.assetsGenerate.run).toHaveBeenCalledWith({ filePaths: [] }, expect.anything())
		expectHealthyPhasesComplete()
		expectNormalCompletion()
	})

	test.each([undefined, null, {}, { failedPieces: [] }])(
		'accepts an empty/older assets checkpoint (%j)',
		async (checkpoint) => {
			const { result } = await runPublish({}, new Map([['assets.generate', checkpoint]]))
			expect(result).toEqual({ ...summary, failedPieces: [] })
			expect(mocks.assetsGenerate.run).not.toHaveBeenCalled()
			expectHealthyPhasesComplete()
			expectNormalCompletion()
		}
	)

	test('preserves failed piece reports from a durable assets checkpoint', async () => {
		const failedPieces = [{ filePath: 'broken.books.md', message: 'cached failure' }]
		const { result } = await runPublish({}, new Map([['assets.generate', { failedPieces }]]))
		expect(result).toEqual({ ...summary, failedPieces })
		expect(mocks.assetsGenerate.run).not.toHaveBeenCalled()
		expectHealthyPhasesComplete()
		expect(mocks.logger.warn).toHaveBeenCalledWith('openworkflow publish complete with failures', {
			jobId: 'publish-1',
			failedCount: 1,
		})
	})
})
