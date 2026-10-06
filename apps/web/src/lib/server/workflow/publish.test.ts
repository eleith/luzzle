import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	createWorkflowQueue,
	closeWorkflowQueue,
	createPendingRun,
	createCompletedRun,
	claimNextRun,
	type WorkflowQueue
} from './publish.fixture.js'
import { getLatestWorkflowRun, getWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import { findInFlightPublishRun, validateAuditForPublish, parsePiecesDiff } from './publish.js'

vi.mock('@luzzle/web.jobs', () => ({
	getLatestWorkflowRun: vi.fn(),
	getWorkflowRun: vi.fn()
}))

const mocks = {
	getLatestWorkflowRun: vi.mocked(getLatestWorkflowRun),
	getWorkflowRun: vi.mocked(getWorkflowRun)
}

const db = {} as never

function makeRun(overrides: Partial<WorkflowRunRow> = {}): WorkflowRunRow {
	return {
		id: 'audit-1',
		workflow_name: 'PublishAudit',
		status: 'completed',
		error: null,
		input: '{}',
		output: null,
		finished_at: null,
		created_at: '2026-06-20T00:00:00Z',
		...overrides
	}
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('findInFlightPublishRun', () => {
	let queue: WorkflowQueue

	beforeEach(() => {
		vi.setSystemTime(new Date('2026-06-20T00:00:00Z'))
		queue = createWorkflowQueue()
	})

	afterEach(async () => {
		vi.useRealTimers()
		await closeWorkflowQueue(queue)
	})

	test.each([
		{ name: 'Publish', status: 'pending' },
		{ name: 'Publish', status: 'running' },
		{ name: 'PublishAudit', status: 'pending' },
		{ name: 'PublishAudit', status: 'running' }
	])('finds an older $status $name behind a newer completed run', async ({ name, status }) => {
		const old = await createPendingRun(queue.backend, name)
		await claimNextRun(queue.backend)
		vi.setSystemTime(new Date('2026-06-20T01:00:00Z'))
		await createCompletedRun(queue.backend, name)
		if (status === 'pending') {
			await queue.backend.rescheduleWorkflowRunAfterFailedStepAttempt({
				workflowRunId: old.id,
				workerId: 'fixture-worker',
				error: { message: 'retry' },
				availableAt: new Date()
			})
		}
		expect(await findInFlightPublishRun(queue.backend)).toEqual({ id: old.id })
	})

	test('returns an active run when both workflows have pending work', async () => {
		const audit = await createPendingRun(queue.backend, 'PublishAudit')
		const publish = await createPendingRun(queue.backend, 'Publish')
		const active = await findInFlightPublishRun(queue.backend)
		expect([audit.id, publish.id]).toContain(active?.id)
	})

	test('ignores finished runs and unrelated active workflows', async () => {
		await createCompletedRun(queue.backend, 'PublishAudit')
		await createPendingRun(queue.backend, 'Publish')
		const failed = await claimNextRun(queue.backend)
		await queue.backend.failWorkflowRun({
			workflowRunId: failed.id,
			workerId: 'fixture-worker',
			error: { message: 'failed' },
			retryPolicy: {
				maximumAttempts: 1,
				initialInterval: '1s',
				backoffCoefficient: 2,
				maximumInterval: '1s'
			}
		})
		await createPendingRun(queue.backend, 'Preview')
		expect(await findInFlightPublishRun(queue.backend)).toBeNull()
	})

	test.each(['Publish', 'PublishAudit'])(
		'finds an active %s in the fifth-newest position',
		async (name) => {
			const old = await createPendingRun(queue.backend, name)
			await claimNextRun(queue.backend)
			vi.setSystemTime(new Date('2026-06-20T01:00:00Z'))
			for (let i = 0; i < 4; i++) await createCompletedRun(queue.backend, name)
			expect(await findInFlightPublishRun(queue.backend)).toEqual({ id: old.id })
		}
	)

	test.each(['Publish', 'PublishAudit'])(
		'accepts the known limit: a sixth-newest active %s is not detected',
		async (name) => {
			const old = await createPendingRun(queue.backend, name)
			await claimNextRun(queue.backend)
			vi.setSystemTime(new Date('2026-06-20T01:00:00Z'))
			for (let i = 0; i < 5; i++) await createCompletedRun(queue.backend, name)
			expect(await findInFlightPublishRun(queue.backend)).toBeNull()
			expect((await queue.backend.getWorkflowRun({ workflowRunId: old.id }))?.status).toBe(
				'running'
			)
		}
	)

	test('checks only the latest five per workflow without paging, status filters or counts', async () => {
		for (let i = 0; i < 5; i++) {
			await createCompletedRun(queue.backend, 'Publish')
			await createCompletedRun(queue.backend, 'PublishAudit')
		}
		await createPendingRun(queue.backend, 'Preview')
		const list = vi.spyOn(queue.backend, 'listWorkflowRuns')
		const count = vi.spyOn(queue.backend, 'countWorkflowRuns')
		expect(await findInFlightPublishRun(queue.backend)).toBeNull()
		expect(list.mock.calls.map(([params]) => params)).toEqual([
			{ workflowName: 'Publish', limit: 5 },
			{ workflowName: 'PublishAudit', limit: 5 }
		])
		expect(count).not.toHaveBeenCalled()
	})

	test('does not miss a running run rescheduled to pending during lookup', async () => {
		const run = await createPendingRun(queue.backend, 'Publish')
		await claimNextRun(queue.backend)
		const original = queue.backend.listWorkflowRuns.bind(queue.backend)
		let rescheduled = false
		vi.spyOn(queue.backend, 'listWorkflowRuns').mockImplementation(async (params) => {
			const page = await original(params)
			if (params.workflowName === 'Publish' && !rescheduled) {
				await queue.backend.rescheduleWorkflowRunAfterFailedStepAttempt({
					workflowRunId: run.id,
					workerId: 'fixture-worker',
					error: { message: 'retry' },
					availableAt: new Date()
				})
				rescheduled = true
			}
			return page
		})
		expect(await findInFlightPublishRun(queue.backend)).toEqual({ id: run.id })
		expect((await queue.backend.getWorkflowRun({ workflowRunId: run.id }))?.status).toBe('pending')
	})

	test('returns null when there are no runs', async () => {
		expect(await findInFlightPublishRun(queue.backend)).toBeNull()
	})
})

describe('validateAuditForPublish', () => {
	test('rejects a missing or non-string id', () => {
		expect(validateAuditForPublish(db, undefined).ok).toBe(false)
		expect(validateAuditForPublish(db, '').ok).toBe(false)
	})

	test('rejects when the run is not found', () => {
		mocks.getWorkflowRun.mockReturnValue(null)
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({
			ok: false,
			reason: 'audit run not found'
		})
	})

	test('rejects when the run is not a PublishAudit', () => {
		mocks.getWorkflowRun.mockReturnValue(makeRun({ workflow_name: 'Publish' }))
		expect(validateAuditForPublish(db, 'audit-1').ok).toBe(false)
	})

	test('rejects when the audit has not completed', () => {
		mocks.getWorkflowRun.mockReturnValue(makeRun({ status: 'running' }))
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({
			ok: false,
			reason: 'audit has not completed'
		})
	})

	test('rejects when a newer audit has run since', () => {
		mocks.getWorkflowRun.mockReturnValue(makeRun({ id: 'audit-1' }))
		mocks.getLatestWorkflowRun.mockReturnValue(makeRun({ id: 'audit-2' }))
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({
			ok: false,
			reason: 'a newer audit has run; re-check before publishing'
		})
	})

	test('rejects when a publish ran after the audit', () => {
		mocks.getWorkflowRun.mockReturnValue(
			makeRun({ id: 'audit-1', created_at: '2026-06-20T00:00:00Z' })
		)
		mocks.getLatestWorkflowRun.mockImplementation((_db, name) =>
			name === 'PublishAudit'
				? makeRun({ id: 'audit-1', created_at: '2026-06-20T00:00:00Z' })
				: makeRun({ id: 'pub-1', workflow_name: 'Publish', created_at: '2026-06-20T01:00:00Z' })
		)
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({
			ok: false,
			reason: 'changes were published after this check; re-check before publishing'
		})
	})

	test('accepts a completed audit that is the latest with no later publish', () => {
		mocks.getWorkflowRun.mockReturnValue(makeRun({ id: 'audit-1' }))
		mocks.getLatestWorkflowRun.mockImplementation((_db, name) =>
			name === 'PublishAudit' ? makeRun({ id: 'audit-1' }) : null
		)
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({ ok: true })
	})

	test('accepts a succeeded audit newer than the last publish', () => {
		mocks.getWorkflowRun.mockReturnValue(
			makeRun({ id: 'audit-1', status: 'succeeded', created_at: '2026-06-20T02:00:00Z' })
		)
		mocks.getLatestWorkflowRun.mockImplementation((_db, name) =>
			name === 'PublishAudit'
				? makeRun({ id: 'audit-1', status: 'succeeded', created_at: '2026-06-20T02:00:00Z' })
				: makeRun({ id: 'pub-1', workflow_name: 'Publish', created_at: '2026-06-20T01:00:00Z' })
		)
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({ ok: true })
	})
})

describe('parsePiecesDiff', () => {
	const validDiff = {
		schemas: { added: ['blog'], updated: [], pruned: ['old'] },
		pieces: { added: ['a.md'], updated: ['b.md'], pruned: [] }
	}

	test('parses a well-formed PiecesDiff', () => {
		expect(parsePiecesDiff(JSON.stringify(validDiff))).toEqual(validDiff)
	})

	test('returns null for null/empty output', () => {
		expect(parsePiecesDiff(null)).toBeNull()
		expect(parsePiecesDiff('')).toBeNull()
	})

	test('returns null for malformed JSON', () => {
		expect(parsePiecesDiff('not json')).toBeNull()
	})

	test('returns null for the legacy "ok" literal', () => {
		expect(parsePiecesDiff(JSON.stringify('ok'))).toBeNull()
	})

	test('returns null when a summary is missing keys', () => {
		expect(
			parsePiecesDiff(JSON.stringify({ schemas: { added: [] }, pieces: validDiff.pieces }))
		).toBeNull()
	})

	test('returns null when an array contains non-strings', () => {
		const bad = {
			schemas: { added: [1], updated: [], pruned: [] },
			pieces: { added: [], updated: [], pruned: [] }
		}
		expect(parsePiecesDiff(JSON.stringify(bad))).toBeNull()
	})

	test('returns null when pieces is absent', () => {
		expect(parsePiecesDiff(JSON.stringify({ schemas: validDiff.schemas }))).toBeNull()
	})
})
