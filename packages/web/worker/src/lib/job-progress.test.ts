import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import { JobProgress } from './job-progress.js'
import type { Kysely } from 'kysely'
import type { WebDatabase } from '../db.js'

describe('JobProgress', () => {
	let testDb: Kysely<WebDatabase>
	let jobProgress: JobProgress

	beforeEach(async () => {
		testDb = await setupDatabase()
		jobProgress = new JobProgress(testDb, 2)
	})

	afterEach(async () => {
		await teardownDatabase(testDb)
	})

	it('should start a phase', async () => {
		await jobProgress.start(42, 'archive.sync')

		const rows = await testDb.selectFrom('job_progress' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 42,
			phase: 'archive.sync',
			status: 'running',
			message: null,
			finished_at: null
		})
		expect(rows[0].started_at).toBeGreaterThan(0)
	})

	it('should complete a phase', async () => {
		await jobProgress.start(42, 'archive.sync')
		await jobProgress.complete(42, 'archive.sync', 'completed successfully')

		const rows = await testDb.selectFrom('job_progress' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 42,
			phase: 'archive.sync',
			status: 'completed',
			message: 'completed successfully'
		})
		expect(rows[0].finished_at).toBeGreaterThan(0)
	})

	it('should skip a phase', async () => {
		await jobProgress.start(42, 'archive.sync')
		await jobProgress.skip(42, 'archive.sync', 'no remote configured')

		const rows = await testDb.selectFrom('job_progress' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 42,
			phase: 'archive.sync',
			status: 'skipped',
			message: 'no remote configured'
		})
		expect(rows[0].finished_at).toBeGreaterThan(0)
	})

	it('should fail a phase with an Error', async () => {
		await jobProgress.start(42, 'archive.sync')
		await jobProgress.fail(42, 'archive.sync', new Error('network error'))

		const rows = await testDb.selectFrom('job_progress' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 42,
			phase: 'archive.sync',
			status: 'failed',
			message: 'network error'
		})
		expect(rows[0].finished_at).toBeGreaterThan(0)
	})

	it('should fail a phase with a string', async () => {
		await jobProgress.start(42, 'archive.sync')
		await jobProgress.fail(42, 'archive.sync', 'string error')

		const rows = await testDb.selectFrom('job_progress' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 42,
			phase: 'archive.sync',
			status: 'failed',
			message: 'string error'
		})
		expect(rows[0].finished_at).toBeGreaterThan(0)
	})

	it('should purge old records based on started_at', async () => {
		// Insert an old record
		await testDb.insertInto('job_progress' as any).values({
			job_id: 1,
			phase: 'old.phase',
			status: 'completed',
			started_at: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days old
		}).execute()

		// Insert a recent record
		await testDb.insertInto('job_progress' as any).values({
			job_id: 2,
			phase: 'new.phase',
			status: 'completed',
			started_at: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day old
		}).execute()

		await jobProgress.purgeOld()

		const rows = await testDb.selectFrom('job_progress' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0].job_id).toBe(2)
	})
})