import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sql } from 'kysely'
import { PhaseLogger } from './phase-logger.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import type { Logger } from '../services/logger.js'
import type { Kysely } from 'kysely'
import type { AppDatabase } from '../services/db.js'

describe('PhaseLogger', () => {
	let testDb: Kysely<AppDatabase>
	let baseLogger: Logger
	let phaseLogger: PhaseLogger

	beforeEach(async () => {
		testDb = (await setupDatabase()).withTables<AppDatabase>()
		baseLogger = {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			stdout: vi.fn(),
			stderr: vi.fn(),
		}
		phaseLogger = new PhaseLogger(baseLogger, testDb)
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		await teardownDatabase(testDb)
	})

	function rows() {
		return testDb.selectFrom('job_progress_logs').selectAll().orderBy('line_number').execute()
	}

	it('writes to the base logger without capturing unscoped messages', async () => {
		phaseLogger.info('test message')
		expect(baseLogger.info).toHaveBeenCalledWith('test message', undefined)
		expect(await rows()).toHaveLength(0)
	})

	it('writes scoped messages and fields to the database', async () => {
		const logger = phaseLogger.forPhase({ jobId: 'test-uuid', phase: 'test.phase' })
		logger.info('test message', { foo: 'bar' })

		await expect.poll(rows).toHaveLength(1)
		expect((await rows())[0]).toMatchObject({
			job_id: 'test-uuid',
			phase: 'test.phase',
			line_number: 1,
			level: 'info',
			message: 'test message {"foo":"bar"}',
		})
	})

	it('increments line_number monotonically', async () => {
		const logger = phaseLogger.forPhase({ jobId: 'test-uuid', phase: 'test.phase' })
		logger.info('msg 1')
		logger.warn('msg 2')

		await expect.poll(rows).toHaveLength(2)
		expect(await rows()).toMatchObject([
			{ line_number: 1, message: 'msg 1' },
			{ line_number: 2, message: 'msg 2' },
		])
	})

	it('routes debug, error, stdout, and stderr through both base logger and DB', async () => {
		const logger = phaseLogger.forPhase({ jobId: 'test-uuid', phase: 'test.phase' })
		logger.debug('dbg msg')
		logger.error('err msg')
		logger.stdout('out msg')
		logger.stderr('err msg2')

		expect(baseLogger.debug).toHaveBeenCalledWith('dbg msg', undefined)
		expect(baseLogger.error).toHaveBeenCalledWith('err msg', undefined)
		expect(baseLogger.stdout).toHaveBeenCalledWith('out msg', undefined)
		expect(baseLogger.stderr).toHaveBeenCalledWith('err msg2', undefined)

		await expect.poll(rows).toHaveLength(4)
		expect((await rows()).map((row) => row.level)).toEqual(['debug', 'error', 'stdout', 'stderr'])
	})

	it('resumes line_number from existing rows when a phase restarts', async () => {
		const first = phaseLogger.forPhase({ jobId: 'test-uuid', phase: 'test.phase' })
		first.info('first attempt')
		await expect.poll(rows).toHaveLength(1)

		const retry = phaseLogger.forPhase({ jobId: 'test-uuid', phase: 'test.phase' })
		retry.info('second attempt')
		await expect.poll(rows).toHaveLength(2)

		expect(await rows()).toMatchObject([
			{ line_number: 1, message: 'first attempt' },
			{ line_number: 2, message: 'second attempt' },
		])
	})

	it.each([
		{ jobId: 'other-job', phase: 'first.phase' },
		{ jobId: 'test-uuid', phase: 'other.phase' },
	])('keeps interleaved scopes independent: %j', async (otherPhase) => {
		const firstPhase = { jobId: 'test-uuid', phase: 'first.phase' }
		const first = phaseLogger.forPhase(firstPhase)
		const other = phaseLogger.forPhase(otherPhase)
		first.info('first 1')
		other.info('other 1')
		phaseLogger.info('unscoped')
		first.info('first 2')
		other.info('other 2')

		await expect.poll(rows).toHaveLength(4)
		const logs = await rows()
		for (const [scope, prefix] of [
			[firstPhase, 'first'],
			[otherPhase, 'other'],
		] as const) {
			expect(
				logs.filter((row) => row.job_id === scope.jobId && row.phase === scope.phase)
			).toMatchObject([
				{ line_number: 1, message: `${prefix} 1` },
				{ line_number: 2, message: `${prefix} 2` },
			])
		}
	})

	it('keeps overlapping attempts and late output ordered for the same destination', async () => {
		const phase = { jobId: 'test-uuid', phase: 'test.phase' }
		const first = phaseLogger.forPhase(phase)
		first.info('first attempt')
		await expect.poll(rows).toHaveLength(1)

		const retry = phaseLogger.forPhase(phase)
		first.info('late first output')
		retry.info('retry output')
		first.info('more late output')
		retry.info('retry finished')

		await expect.poll(rows).toHaveLength(5)
		expect(await rows()).toMatchObject([
			{ job_id: phase.jobId, phase: phase.phase, line_number: 1, message: 'first attempt' },
			{ job_id: phase.jobId, phase: phase.phase, line_number: 2, message: 'late first output' },
			{ job_id: phase.jobId, phase: phase.phase, line_number: 3, message: 'retry output' },
			{ job_id: phase.jobId, phase: phase.phase, line_number: 4, message: 'more late output' },
			{ job_id: phase.jobId, phase: phase.phase, line_number: 5, message: 'retry finished' },
		])
	})

	it('still forwards messages if progress log storage fails', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		await sql`DROP TABLE job_progress_logs`.execute(testDb)
		const logger = phaseLogger.forPhase({ jobId: 'test-uuid', phase: 'test.phase' })
		logger.info('test message')

		expect(baseLogger.info).toHaveBeenCalledWith('test message', undefined)
		await expect.poll(() => error.mock.calls.length).toBe(1)
		expect(error.mock.calls[0][0]).toContain('Failed to insert log')
	})
})
