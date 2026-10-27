import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { OpenWorkflow, defineWorkflowSpec, type Worker } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import { getOpenWorkflow, getOpenWorkflowBackend } from '@luzzle/web.jobs'
import { jobProgressPurgeSpec } from '@luzzle/web.jobs/specs'
import { promises as fs } from 'node:fs'
import type * as Crypto from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { validateConfig } from '@luzzle/web.config'
import { getWorkerContext, type WorkerContext } from '../services/context.js'
import { JobProgress } from '../core/job-progress.js'
import { makeLogger } from '../../test/logger.js'
import { registerJobProgressPurgeWorkflow } from './job-progress-purge.js'

const { jitter } = vi.hoisted(() => ({ jitter: vi.fn(() => 0) }))
vi.mock('node:crypto', async (original) => ({
	...(await original<typeof Crypto>()),
	randomInt: jitter,
}))
vi.mock('@luzzle/web.jobs', () => ({ getOpenWorkflow: vi.fn(), getOpenWorkflowBackend: vi.fn() }))
vi.mock('../services/context.js', () => ({ getWorkerContext: vi.fn() }))
const day = 86_400_000
const now = new Date('2026-06-02T12:00:00Z')
const candidateSpec = defineWorkflowSpec({ name: 'PreviewFixture' })

describe('native preview maintenance', () => {
	let directory: string, previews: string
	let backend: BackendSqlite, client: OpenWorkflow, worker: Worker
	let ctx: WorkerContext, progress: JobProgress
	const getRun = (workflowRunId: string) => backend.getWorkflowRun({ workflowRunId })
	const steps = async (workflowRunId: string) =>
		(await backend.listStepAttempts({ workflowRunId })).data
	const preview = (id: string) => path.join(previews, id)

	function connect() {
		backend = BackendSqlite.connect(path.join(directory, 'workflows.sqlite'))
		client = new OpenWorkflow({ backend, logger: makeLogger() })
		vi.mocked(getOpenWorkflow).mockReturnValue(client)
		vi.mocked(getOpenWorkflowBackend).mockReturnValue(backend)
		registerJobProgressPurgeWorkflow()
		worker = client.newWorker({ concurrency: 1 })
	}
	beforeEach(async () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(now)
		jitter.mockReset().mockReturnValue(0)
		directory = await fs.mkdtemp(path.join(tmpdir(), 'luzzle-maintenance-'))
		previews = path.join(directory, 'previews')
		const db = createAppDb(path.join(directory, 'app.sqlite'))
		expect((await runWebMigrations(db)).error).toBeUndefined()
		const config = validateConfig(
			{
				storage: { root: directory },
				paths: { assets: path.join(directory, 'pieces') },
			},
			{}
		)
		ctx = { db, config, logger: makeLogger(), rclone: {} as WorkerContext['rclone'] }
		vi.mocked(getWorkerContext).mockReturnValue(ctx)
		progress = new JobProgress(db)
		connect()
	})
	afterEach(async () => {
		await worker.stop()
		vi.restoreAllMocks()
		await backend.stop()
		await ctx.db.destroy()
		await fs.rm(directory, { recursive: true, force: true })
		vi.useRealTimers()
	})
	async function tick() {
		expect(await worker.tick()).toBe(1)
		await worker.stop()
	}
	async function seedPreviewData(id: string, rows: 'both' | 'logs' | 'none' = 'both') {
		if (rows === 'both') await progress.start(id, 'render')
		if (rows !== 'none')
			await ctx.db
				.insertInto('job_progress_logs')
				.values({
					job_id: id,
					phase: 'render',
					line_number: 1,
					ts: Date.now(),
					level: 'info',
					message: 'rendered',
				})
				.execute()
		await fs.mkdir(preview(id), { recursive: true })
		await fs.writeFile(path.join(preview(id), 'preview.bin'), 'preview output')
	}
	async function createCandidateRun(
		status = 'completed',
		finishedAgeMs = 8 * day,
		rows: 'both' | 'logs' | 'none' = 'both'
	) {
		vi.setSystemTime(now.getTime() - 20 * day)
		const options = status === 'pending' ? { availableAt: new Date(now.getTime() + day) } : {}
		const { workflowRun: run } = await client.runWorkflow(candidateSpec, {}, options)
		const owned = { workflowRunId: run.id, workerId: 'fixture' }
		if (status !== 'pending') {
			const claim = await backend.claimWorkflowRun({
				workerId: 'fixture',
				leaseDurationMs: 40 * day,
			})
			expect(claim?.id).toBe(run.id)
			const step = await backend.createStepAttempt({
				...owned,
				stepName: 'render',
				kind: 'function',
				config: {},
				context: null,
			})
			await backend.completeStepAttempt({ ...owned, stepAttemptId: step.id, output: 'rendered' })
			vi.setSystemTime(now.getTime() - finishedAgeMs)
			if (status === 'completed') await backend.completeWorkflowRun({ ...owned, output: 'ok' })
			if (status === 'failed')
				await backend.failWorkflowRun({
					...owned,
					error: { message: 'failed' },
					retryPolicy: {
						maximumAttempts: 1,
						initialInterval: '1s',
						maximumInterval: '1s',
						backoffCoefficient: 1,
					},
				})
			if (status === 'canceled') await backend.cancelWorkflowRun({ workflowRunId: run.id })
		}
		vi.setSystemTime(now)
		await seedPreviewData(run.id, rows)
		return run.id
	}
	async function purge() {
		const handle = await client.runWorkflow(jobProgressPurgeSpec, {})
		await tick()
		return handle.workflowRun.id
	}

	test('removes aged terminal app data and directories without deleting SDK history', async () => {
		const expired = [
			await createCandidateRun(),
			await createCandidateRun('failed', 8 * day, 'logs'),
			await createCandidateRun('canceled', 8 * day, 'none'),
		]
		const kept = [
			await createCandidateRun('completed', day),
			await createCandidateRun('completed', 7 * day),
			await createCandidateRun('running'),
			await createCandidateRun('pending'),
			'unknown',
		]
		await seedPreviewData('unknown')
		await progress.start('../outside', 'render')
		await fs.writeFile(path.join(directory, 'outside'), 'keep')
		const history = await Promise.all(
			expired.map(async (id) => [await getRun(id), await steps(id)])
		)
		await purge()
		for (let index = 0; index < expired.length; index++) {
			const id = expired[index]
			await expect(fs.stat(preview(id))).rejects.toMatchObject({ code: 'ENOENT' })
			expect(await progress.listJobIds()).not.toContain(id)
			expect([await getRun(id), await steps(id)]).toEqual(history[index])
		}
		for (const id of kept) {
			expect(await fs.readFile(path.join(preview(id), 'preview.bin'), 'utf8')).toBe(
				'preview output'
			)
			expect(await progress.listJobIds()).toContain(id)
		}
		expect(await fs.readFile(path.join(directory, 'outside'), 'utf8')).toBe('keep')
	})

	test('honors an explicit retention window and rejects a non-positive window without deleting data', async () => {
		const id = await createCandidateRun()
		const extended = await client.runWorkflow(jobProgressPurgeSpec, { retentionDays: 14 })
		await tick()
		expect((await getRun(extended.workflowRun.id))?.status).toBe('completed')
		expect(await fs.stat(preview(id))).toBeDefined()
		expect(await progress.listJobIds()).toContain(id)
		const invalid = await client.runWorkflow(jobProgressPurgeSpec, { retentionDays: 0 })
		await tick()
		expect((await getRun(invalid.workflowRun.id))?.status).toBe('failed')
		expect(await fs.stat(preview(id))).toBeDefined()
		expect(await progress.listJobIds()).toContain(id)
	})

	test('file failure preserves rows and retries saved paths and IDs, even after deleting files', async () => {
		const id = await createCandidateRun()
		const recent = await createCandidateRun('completed', day)
		const list = vi.spyOn(JobProgress.prototype, 'listJobIds')
		const rm = fs.rm
		vi.spyOn(fs, 'rm').mockImplementationOnce(async (target, options) => {
			await rm(target, options)
			throw new Error('file deletion interrupted')
		})
		const purgeId = await purge()
		await expect(fs.stat(preview(id))).rejects.toMatchObject({ code: 'ENOENT' })
		expect(
			await ctx.db
				.selectFrom('job_progress_logs')
				.select('job_id')
				.where('job_id', '=', id)
				.execute()
		).toHaveLength(1)
		expect(
			await ctx.db.selectFrom('job_progress').select('job_id').where('job_id', '=', id).execute()
		).toHaveLength(1)
		const attempts = await steps(purgeId)
		expect(attempts.find((step) => step.stepName === 'plan-cleanup')?.output).toEqual({
			cutoffMs: now.getTime() - 7 * day,
			jobIds: [id],
			previewDirs: [preview(id)],
		})
		expect(attempts.find((step) => step.stepName === 'purge-preview-directories')?.status).toBe(
			'failed'
		)
		ctx.config.paths.assets = path.join(directory, 'different-root', 'pieces')
		vi.setSystemTime(now.getTime() + 10 * day)
		await tick()
		expect(list).toHaveBeenCalledTimes(1)
		expect(jitter).toHaveBeenCalledTimes(1)
		expect(await progress.listJobIds()).toEqual([recent])
		expect(await fs.stat(preview(recent))).toBeDefined()
		expect((await getRun(purgeId))?.status).toBe('completed')
	})

	test.each(['before', 'after'])(
		'retries app deletion %s commit after files are gone',
		async (boundary) => {
			const id = await createCandidateRun()
			const original = JobProgress.prototype.purgeJobs
			const remove = vi
				.spyOn(JobProgress.prototype, 'purgeJobs')
				.mockImplementationOnce(async function (this: JobProgress, ids) {
					if (boundary === 'after') await original.call(this, ids)
					throw new Error('app deletion interrupted')
				})
			const files = vi.spyOn(fs, 'rm')
			const list = vi.spyOn(JobProgress.prototype, 'listJobIds')
			const purgeId = await purge()
			await expect(fs.stat(preview(id))).rejects.toMatchObject({ code: 'ENOENT' })
			expect(await progress.listJobIds()).toEqual(boundary === 'before' ? [id] : [])
			list.mockClear()
			vi.setSystemTime(now.getTime() + day)
			await tick()
			expect(list).not.toHaveBeenCalled()
			expect(remove.mock.calls).toEqual([[[id]], [[id]]])
			expect(files).toHaveBeenCalledTimes(1)
			expect(await progress.listJobIds()).toEqual([])
			expect((await getRun(purgeId))?.status).toBe('completed')
		}
	)

	test('propagates discovery errors but treats a missing previews root as empty', async () => {
		const id = await createCandidateRun()
		await fs.rm(previews, { recursive: true })
		const list = vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('directory unavailable'))
		const purgeId = await purge()
		expect(await progress.listJobIds()).toEqual([id])
		vi.setSystemTime(now.getTime() + day)
		await tick()
		expect(list).toHaveBeenCalledTimes(2)
		expect(await progress.listJobIds()).toEqual([])
		expect((await getRun(purgeId))?.status).toBe('completed')
	})

	test('persists jitter, releases the only slot during native sleep, and resumes the saved choice', async () => {
		jitter.mockReturnValueOnce(1440).mockReturnValueOnce(0)
		const first = await purge()
		expect(await getRun(first)).toMatchObject({
			status: 'running',
			workerId: null,
			availableAt: new Date(now.getTime() + 1440_000),
		})
		const attempts = await steps(first)
		expect(attempts.find((step) => step.stepName === 'choose-cleanup-jitter')).toMatchObject({
			status: 'completed',
			output: 1440,
		})
		expect(attempts.find((step) => step.stepName === 'cleanup-jitter')).toMatchObject({
			kind: 'sleep',
		})
		await backend.stop()
		connect()
		const second = await purge()
		expect((await getRun(second))?.status).toBe('completed')
		vi.setSystemTime(now.getTime() + 1440_000)
		await tick()
		expect((await getRun(first))?.status).toBe('completed')
		expect(jitter.mock.calls).toEqual([
			[0, 1441],
			[0, 1441],
		])
	})

	test('persists cron and pause across restart and coalesces missed occurrences', async () => {
		const scheduleId = 'luzzle:job-progress-purge'
		await worker.start()
		await worker.stop()
		const saved = await client.schedules.get(scheduleId)
		expect(saved).toMatchObject({
			cron: '0 48 1 * * *',
			timezone: 'UTC',
			input: { retentionDays: 7 },
			nextRunAt: new Date('2026-06-03T01:48:00Z'),
		})
		await backend.stop()
		connect()
		await worker.start()
		await worker.stop()
		expect(await client.schedules.get(scheduleId)).toEqual(saved)
		await client.schedules.pause(scheduleId)
		await backend.stop()
		connect()
		await worker.start()
		await worker.stop()
		expect((await client.schedules.get(scheduleId))?.nextRunAt).toBeNull()
		await client.schedules.resume(scheduleId)
		vi.setSystemTime(new Date('2026-06-06T12:00:00Z'))
		expect(await backend.enqueueScheduledRuns({ before: new Date(), limit: 100 })).toBe(1)
		expect(await backend.enqueueScheduledRuns({ before: new Date(), limit: 100 })).toBe(0)
		const runs = (await backend.listWorkflowRuns({ workflowName: jobProgressPurgeSpec.name })).data
		expect(runs).toHaveLength(1)
		expect(runs[0].workflowScheduleId).toBe(scheduleId)
		await tick()
		expect((await getRun(runs[0].id))?.status).toBe('completed')
		expect((await client.schedules.get(scheduleId))?.nextRunAt).toEqual(
			new Date('2026-06-07T01:48:00Z')
		)
	})
})
