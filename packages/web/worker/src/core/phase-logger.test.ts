import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
		testDb = await setupDatabase()

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
		phaseLogger.clearActivePhase()
		await teardownDatabase(testDb)
	})

	it('should write to base logger always', async () => {
		phaseLogger.info('test message')
		expect(baseLogger.info).toHaveBeenCalledWith('test message', undefined)
	})

	it('should not write to db if no active phase is set', async () => {
		phaseLogger.info('test message')

		await new Promise((resolve) => setTimeout(resolve, 10))

		const rows = await testDb.selectFrom('job_progress_logs').selectAll().execute()
		expect(rows).toHaveLength(0)
	})

	it('should write to db when active phase is set', async () => {
		phaseLogger.setActivePhase({ jobId: 'test-uuid', phase: 'test.phase' })
		phaseLogger.info('test message', { foo: 'bar' })

		await new Promise((resolve) => setTimeout(resolve, 50))

		const rows = await testDb.selectFrom('job_progress_logs').selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 'test-uuid',
			phase: 'test.phase',
			line_number: 1,
			level: 'info',
			message: 'test message {"foo":"bar"}',
		})
	})

	it('should increment line_number monotonically', async () => {
		phaseLogger.setActivePhase({ jobId: 'test-uuid', phase: 'test.phase' })
		phaseLogger.info('msg 1')
		phaseLogger.warn('msg 2')

		await new Promise((resolve) => setTimeout(resolve, 50))

		const rows = await testDb
			.selectFrom('job_progress_logs')
			.selectAll()
			.orderBy('line_number', 'asc')
			.execute()
		expect(rows).toHaveLength(2)
		expect(rows[0].line_number).toBe(1)
		expect(rows[0].message).toBe('msg 1')
		expect(rows[1].line_number).toBe(2)
		expect(rows[1].message).toBe('msg 2')
	})

	it('routes debug, error, stdout, and stderr through both base logger and DB', async () => {
		phaseLogger.setActivePhase({ jobId: 'test-uuid', phase: 'test.phase' })
		phaseLogger.debug('dbg msg')
		phaseLogger.error('err msg')
		phaseLogger.stdout('out msg')
		phaseLogger.stderr('err msg2')

		expect(baseLogger.debug).toHaveBeenCalledWith('dbg msg', undefined)
		expect(baseLogger.error).toHaveBeenCalledWith('err msg', undefined)
		expect(baseLogger.stdout).toHaveBeenCalledWith('out msg', undefined)
		expect(baseLogger.stderr).toHaveBeenCalledWith('err msg2', undefined)

		await new Promise((resolve) => setTimeout(resolve, 50))

		const rows = await testDb
			.selectFrom('job_progress_logs')
			.select('level')
			.orderBy('line_number', 'asc')
			.execute()
		expect(rows.map((r) => r.level)).toEqual(['debug', 'error', 'stdout', 'stderr'])
	})
})
