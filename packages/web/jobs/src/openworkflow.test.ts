import { describe, expect, test } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import {
	initOpenWorkflow,
	getOpenWorkflow,
	getLatestWorkflowRun,
	getWorkflowRunByJobId,
	getWorkflowRun,
	getStepAttempts,
	jobProgressPurgeSpec,
	previewSpec,
	publishSpec,
} from './index.js'

describe('openworkflow client initialization', () => {
	test('throws before initialization', () => {
		expect(() => getOpenWorkflow()).toThrow(/has not been initialized/)
	})

	test('initializes and returns singleton instance', () => {
		const client = initOpenWorkflow({ dbPath: ':memory:' })
		expect(client).toBeDefined()
		expect(getOpenWorkflow()).toBe(client)
	})
})

describe('database helpers', () => {
	test('queries workflow runs and step attempts', () => {
		const db = new DatabaseSync(':memory:')

		// Create tables
		db.exec(`
			CREATE TABLE workflow_runs (
				id TEXT PRIMARY KEY,
				workflow_name TEXT NOT NULL,
				status TEXT NOT NULL,
				error TEXT,
				input TEXT NOT NULL,
				output TEXT,
				finished_at TEXT,
				created_at TEXT NOT NULL
			)
		`)

		db.exec(`
			CREATE TABLE step_attempts (
				id TEXT PRIMARY KEY,
				workflow_run_id TEXT NOT NULL,
				step_name TEXT NOT NULL,
				status TEXT NOT NULL,
				started_at TEXT,
				finished_at TEXT,
				error TEXT,
				created_at TEXT NOT NULL
			)
		`)

		// 1. Test getLatestWorkflowRun when no runs exist
		expect(getLatestWorkflowRun(db, 'Publish')).toBeNull()

		// Insert dummy runs
		db.prepare(`
			INSERT INTO workflow_runs (id, workflow_name, status, error, input, output, finished_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).run('run-1', 'Publish', 'completed', null, '{}', 'ok', null, '2026-06-02T05:00:00Z')

		db.prepare(`
			INSERT INTO workflow_runs (id, workflow_name, status, error, input, output, finished_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).run('run-2', 'Publish', 'failed', 'some error', '{"jobId":123}', null, null, '2026-06-02T05:10:00Z')

		// Test getLatestWorkflowRun returns the latest by created_at DESC
		const latest = getLatestWorkflowRun(db, 'Publish')
		expect(latest).not.toBeNull()
		expect(latest!.id).toBe('run-2')
		expect(latest!.error).toBe('some error')

		// 2. Test getWorkflowRunByJobId
		const runByJobId = getWorkflowRunByJobId(db, 123)
		expect(runByJobId).not.toBeNull()
		expect(runByJobId!.id).toBe('run-2')

		const runByNonexistentJobId = getWorkflowRunByJobId(db, 999)
		expect(runByNonexistentJobId).toBeNull()

		// 3. Test getWorkflowRun
		const run = getWorkflowRun(db, 'run-1')
		expect(run).not.toBeNull()
		expect(run!.id).toBe('run-1')

		const nonexistentRun = getWorkflowRun(db, 'nonexistent')
		expect(nonexistentRun).toBeNull()

		// 4. Test getStepAttempts
		db.prepare(`
			INSERT INTO step_attempts (id, workflow_run_id, step_name, status, started_at, finished_at, error, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).run('step-1', 'run-1', 'step-parse', 'completed', '2026-06-02T05:01:00Z', '2026-06-02T05:02:00Z', null, '2026-06-02T05:01:00Z')

		db.prepare(`
			INSERT INTO step_attempts (id, workflow_run_id, step_name, status, started_at, finished_at, error, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`).run('step-2', 'run-1', 'step-transform', 'failed', '2026-06-02T05:03:00Z', '2026-06-02T05:04:00Z', 'transform error', '2026-06-02T05:03:00Z')

		const steps = getStepAttempts(db, 'run-1')
		expect(steps).toHaveLength(2)
		expect(steps[0]).toEqual({
			phase: 'step-parse',
			status: 'completed',
			started_at: '2026-06-02T05:01:00Z',
			finished_at: '2026-06-02T05:02:00Z',
			message: null,
		})
		expect(steps[1]).toEqual({
			phase: 'step-transform',
			status: 'failed',
			started_at: '2026-06-02T05:03:00Z',
			finished_at: '2026-06-02T05:04:00Z',
			message: 'transform error',
		})
	})
})

describe('workflow specs', () => {
	test('defines the required workflow specs', () => {
		expect(jobProgressPurgeSpec).toBeDefined()
		expect(jobProgressPurgeSpec.name).toBe('JobProgressPurge')

		expect(previewSpec).toBeDefined()
		expect(previewSpec.name).toBe('Preview')

		expect(publishSpec).toBeDefined()
		expect(publishSpec.name).toBe('Publish')
	})
})
