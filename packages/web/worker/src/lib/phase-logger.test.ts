/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PhaseLogger, setActivePhase, clearActivePhase } from './phase-logger.js'
import { setWorkerContext, type WorkerContext } from '../handlers/context.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'
import type { Logger } from '../logger.js'
import type { Kysely } from 'kysely'
import type { AppDatabase } from '../db.js'
import type { Config } from '@luzzle/web.config'

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
		}
		
		phaseLogger = new PhaseLogger(baseLogger)

		const ctx: WorkerContext = {
			config: {} as Config,
			logger: phaseLogger,
			rclone: {} as any,
			db: testDb,
		}
		setWorkerContext(ctx)
	})

	afterEach(async () => {
		clearActivePhase()
		await teardownDatabase(testDb)
	})

	it('should write to base logger always', async () => {
		phaseLogger.info('test message')
		expect(baseLogger.info).toHaveBeenCalledWith('test message', undefined)
	})

	it('should not write to db if no active phase is set', async () => {
		phaseLogger.info('test message')

		// Wait a tick to allow the async insertLog to settle if it were to run
		await new Promise(resolve => setTimeout(resolve, 10))

		const rows = await testDb.selectFrom('job_progress_logs' as any).selectAll().execute()
		expect(rows).toHaveLength(0)
	})

	it('should write to db when active phase is set', async () => {
		setActivePhase({ jobId: 1, phase: 'test.phase' })
		phaseLogger.info('test message', { foo: 'bar' })

		// Wait a tick
		await new Promise(resolve => setTimeout(resolve, 50))

		const rows = await testDb.selectFrom('job_progress_logs' as any).selectAll().execute()
		expect(rows).toHaveLength(1)
		expect(rows[0]).toMatchObject({
			job_id: 1,
			phase: 'test.phase',
			line_number: 1,
			level: 'info',
			message: 'test message {"foo":"bar"}',
		})
	})

	it('should increment line_number monotonically', async () => {
		setActivePhase({ jobId: 1, phase: 'test.phase' })
		phaseLogger.info('msg 1')
		phaseLogger.warn('msg 2')

		// Wait a tick
		await new Promise(resolve => setTimeout(resolve, 50))

		const rows = await testDb.selectFrom('job_progress_logs' as any).selectAll().orderBy('line_number', 'asc').execute()
		expect(rows).toHaveLength(2)
		expect(rows[0].line_number).toBe(1)
		expect(rows[0].message).toBe('msg 1')
		expect(rows[1].line_number).toBe(2)
		expect(rows[1].message).toBe('msg 2')
	})
})
