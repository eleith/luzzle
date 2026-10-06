import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { spawn } from 'child_process'
import { createPhaseContext, type WorkerContext } from './context.js'
import { PhaseLogger } from '../core/phase-logger.js'
import type { AppDatabase } from './db.js'
import { RcloneClient } from './rclone.js'
import { setupDatabase, teardownDatabase } from '../../test/db.js'

vi.mock('child_process', () => ({ spawn: vi.fn() }))

function childProcess() {
	return Object.assign(new EventEmitter(), {
		stdout: new EventEmitter(),
		stderr: new EventEmitter(),
	})
}

describe('createPhaseContext', () => {
	let ctx: WorkerContext
	const baseLogger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		stdout: vi.fn(),
		stderr: vi.fn(),
	}

	beforeEach(async () => {
		vi.clearAllMocks()
		const db = (await setupDatabase()).withTables<AppDatabase>()
		const logger = new PhaseLogger(baseLogger, db)
		ctx = { db, logger, rclone: new RcloneClient(logger), config: {} as WorkerContext['config'] }
	})

	afterEach(async () => {
		await teardownDatabase(ctx.db)
	})

	test('leaves contexts with a plain logger unchanged', () => {
		const plain = { ...ctx, logger: baseLogger }
		expect(createPhaseContext(plain, 'job1', 'sync')).toBe(plain)
	})

	test('binds interleaved rclone output to each phase without changing shared services', async () => {
		const first = createPhaseContext(ctx, 'job1', 'sync')
		const other = createPhaseContext(ctx, 'job2', 'sync')
		expect(first.config).toBe(ctx.config)
		expect(first.db).toBe(ctx.db)
		expect(first.logger).not.toBe(ctx.logger)
		expect(other.logger).not.toBe(first.logger)
		expect(first.rclone).not.toBe(ctx.rclone)
		expect(other.rclone).not.toBe(first.rclone)

		const firstChild = childProcess()
		const otherChild = childProcess()
		const rootChild = childProcess()
		vi.mocked(spawn)
			.mockReturnValueOnce(firstChild as unknown as ReturnType<typeof spawn>)
			.mockReturnValueOnce(otherChild as unknown as ReturnType<typeof spawn>)
			.mockReturnValueOnce(rootChild as unknown as ReturnType<typeof spawn>)
		const options = {
			localPath: '/local',
			remote: 'cdn',
			remotePath: 'assets',
			configPath: '/conf',
		}
		const firstRun = first.rclone.sync(options)
		const otherRun = other.rclone.sync(options)
		const rootRun = ctx.rclone.sync(options)
		let firstClosed = false

		try {
			firstChild.stdout.emit('data', Buffer.from('first part'))
			otherChild.stderr.emit('data', Buffer.from('other error\n'))
			rootChild.stdout.emit('data', Buffer.from('unscoped output\n'))
			firstChild.stdout.emit('data', Buffer.from(' complete\nfirst tail'))
			firstClosed = true
			firstChild.emit('close', 0)
			await firstRun
			otherChild.stdout.emit('data', Buffer.from('other output\n'))
		} finally {
			if (!firstClosed) firstChild.emit('close', 0)
			otherChild.emit('close', 0)
			rootChild.emit('close', 0)
			await Promise.all([firstRun, otherRun, rootRun])
		}

		const logs = () =>
			ctx.db
				.selectFrom('job_progress_logs')
				.selectAll()
				.orderBy('job_id')
				.orderBy('line_number')
				.execute()
		await expect.poll(logs).toHaveLength(6)
		expect(await logs()).toMatchObject([
			{ job_id: 'job1', phase: 'sync', line_number: 1, level: 'info' },
			{
				job_id: 'job1',
				phase: 'sync',
				line_number: 2,
				level: 'stdout',
				message: 'first part complete',
			},
			{ job_id: 'job1', phase: 'sync', line_number: 3, level: 'stdout', message: 'first tail' },
			{ job_id: 'job2', phase: 'sync', line_number: 1, level: 'info' },
			{ job_id: 'job2', phase: 'sync', line_number: 2, level: 'stderr', message: 'other error' },
			{ job_id: 'job2', phase: 'sync', line_number: 3, level: 'stdout', message: 'other output' },
		])
		expect(baseLogger.stdout).toHaveBeenCalledWith('unscoped output', undefined)
	})
})
