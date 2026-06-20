import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getLatestWorkflowRun, getWorkflowRun, type WorkflowRunRow } from '@luzzle/web.jobs'
import { findInFlightPublishRun, validateAuditForPublish } from './publish-guard.js'

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
	test('returns the in-flight Publish run', () => {
		mocks.getLatestWorkflowRun.mockImplementation((_db, name) =>
			name === 'Publish'
				? makeRun({ id: 'pub-1', workflow_name: 'Publish', status: 'running' })
				: null
		)
		expect(findInFlightPublishRun(db)?.id).toBe('pub-1')
	})

	test('returns the in-flight PublishAudit run', () => {
		mocks.getLatestWorkflowRun.mockImplementation((_db, name) =>
			name === 'PublishAudit' ? makeRun({ id: 'aud-1', status: 'pending' }) : null
		)
		expect(findInFlightPublishRun(db)?.id).toBe('aud-1')
	})

	test('returns null when neither is in-flight', () => {
		mocks.getLatestWorkflowRun.mockImplementation((_db, name) =>
			makeRun({ workflow_name: name, status: 'completed' })
		)
		expect(findInFlightPublishRun(db)).toBeNull()
	})

	test('returns null when there are no runs', () => {
		mocks.getLatestWorkflowRun.mockReturnValue(null)
		expect(findInFlightPublishRun(db)).toBeNull()
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

	test('accepts a completed audit that is still the latest', () => {
		mocks.getWorkflowRun.mockReturnValue(makeRun({ id: 'audit-1' }))
		mocks.getLatestWorkflowRun.mockReturnValue(makeRun({ id: 'audit-1' }))
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({ ok: true })
	})

	test('accepts a succeeded audit', () => {
		mocks.getWorkflowRun.mockReturnValue(makeRun({ id: 'audit-1', status: 'succeeded' }))
		mocks.getLatestWorkflowRun.mockReturnValue(makeRun({ id: 'audit-1', status: 'succeeded' }))
		expect(validateAuditForPublish(db, 'audit-1')).toEqual({ ok: true })
	})
})
