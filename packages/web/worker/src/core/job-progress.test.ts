import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createAppDb, runWebMigrations } from '@luzzle/web.db'
import { sql } from 'kysely'
import { JobProgress } from './job-progress.js'

describe('JobProgress', () => {
	let testDb: ReturnType<typeof createAppDb>
	let jobProgress: JobProgress

	beforeEach(async () => {
		testDb = createAppDb(':memory:')
		expect((await runWebMigrations(testDb)).error).toBeUndefined()
		jobProgress = new JobProgress(testDb)
	})

	afterEach(async () => {
		await testDb.destroy()
	})

	it('starts and restarts a phase', async () => {
		await jobProgress.start('42', 'archive.sync')
		await jobProgress.complete('42', 'archive.sync', 'done')
		await jobProgress.start('42', 'archive.sync')
		const rows = await testDb.selectFrom('job_progress').selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: '42',
			phase: 'archive.sync',
			status: 'running',
			message: null,
			finished_at: null,
		})
		expect(rows[0].started_at).toBeGreaterThan(0)
	})

	it('completes a phase', async () => {
		await jobProgress.start('42', 'archive.sync')
		await jobProgress.complete('42', 'archive.sync', 'completed successfully')
		const row = await testDb.selectFrom('job_progress').selectAll().executeTakeFirstOrThrow()
		expect(row).toMatchObject({ status: 'completed', message: 'completed successfully' })
		expect(row.finished_at).toBeGreaterThan(0)
	})

	it('skips a phase', async () => {
		await jobProgress.start('42', 'archive.sync')
		await jobProgress.skip('42', 'archive.sync', 'no remote configured')
		const row = await testDb.selectFrom('job_progress').selectAll().executeTakeFirstOrThrow()
		expect(row).toMatchObject({ status: 'skipped', message: 'no remote configured' })
		expect(row.finished_at).toBeGreaterThan(0)
	})

	it.each([new Error('network error'), 'network error'])('fails a phase: %s', async (error) => {
		await jobProgress.start('42', 'archive.sync')
		await jobProgress.fail('42', 'archive.sync', error)
		const row = await testDb.selectFrom('job_progress').selectAll().executeTakeFirstOrThrow()
		expect(row).toMatchObject({ status: 'failed', message: 'network error' })
		expect(row.finished_at).toBeGreaterThan(0)
	})

	async function log(jobId: string) {
		await testDb
			.insertInto('job_progress_logs')
			.values({
				job_id: jobId,
				phase: 'render',
				line_number: 1,
				ts: Date.now(),
				level: 'info',
				message: 'log',
			})
			.execute()
	}

	it('lists the distinct union of progress and log IDs, including logs without progress', async () => {
		await jobProgress.start('both', 'one')
		await jobProgress.start('both', 'two')
		await jobProgress.start('progress-only', 'one')
		await log('both')
		await log('logs-only')
		expect((await jobProgress.listJobIds()).sort()).toEqual(['both', 'logs-only', 'progress-only'])
	})

	it('purges only selected IDs in bounded chunks, idempotently', async () => {
		const ids = Array.from({ length: 205 }, (_, index) => `job-${index}`)
		for (const id of [...ids, 'keep']) {
			await jobProgress.start(id, 'render')
			await log(id)
		}
		await jobProgress.purgeJobs(ids)
		await jobProgress.purgeJobs(ids)
		await jobProgress.purgeJobs([])
		expect(await jobProgress.listJobIds()).toEqual(['keep'])
		expect(await testDb.selectFrom('job_progress').select('job_id').execute()).toEqual([
			{ job_id: 'keep' },
		])
		expect(await testDb.selectFrom('job_progress_logs').select('job_id').execute()).toEqual([
			{ job_id: 'keep' },
		])
	})

	it('rolls back logs and earlier chunks and propagates database failures', async () => {
		const ids = Array.from({ length: 101 }, (_, index) => `job-${index}`)
		for (const id of ids) {
			await jobProgress.start(id, 'render')
			await log(id)
		}
		await sql`CREATE TRIGGER prevent_purge BEFORE DELETE ON job_progress
			WHEN OLD.job_id = 'job-100' BEGIN SELECT RAISE(FAIL, 'delete failed'); END`.execute(testDb)
		await expect(jobProgress.purgeJobs(ids)).rejects.toThrow('delete failed')
		expect(await testDb.selectFrom('job_progress').selectAll().execute()).toHaveLength(101)
		expect(await testDb.selectFrom('job_progress_logs').selectAll().execute()).toHaveLength(101)
	})
})
