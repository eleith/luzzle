import { beforeEach, expect, test, vi } from 'vitest'
import { getLatestWorkflowRun, getStepAttempts, type WorkflowRunRow } from '@luzzle/web.jobs'
import { load } from './+page.server.js'

const { query } = vi.hoisted(() => ({
	query: {
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn()
	}
}))
vi.mock('$lib/server/database/index.js', () => ({ db: { selectFrom: () => query } }))
vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture.js')
	return { config: makeConfig() }
})
vi.mock('$lib/server/workflow/index.js', () => ({ getOpenWorkflowBackend: () => ({}) }))
vi.mock('@luzzle/web.jobs', () => ({ getLatestWorkflowRun: vi.fn(), getStepAttempts: vi.fn() }))

const diff = {
	schemas: { added: [], updated: [], pruned: [] },
	pieces: { added: ['new.book.md'], updated: [], pruned: [] }
}
function run(name: string): WorkflowRunRow {
	return {
		id: `${name}-id`,
		workflow_name: name,
		status: 'completed',
		error: null,
		input: '{}',
		output: JSON.stringify(diff),
		finished_at: '2026-06-20T00:01:00Z',
		created_at: '2026-06-20T00:00:00Z'
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	query.execute.mockResolvedValue([])
	vi.mocked(getLatestWorkflowRun).mockImplementation(async (_backend, name) => run(name))
	vi.mocked(getStepAttempts).mockResolvedValue([
		{
			phase: 'sync',
			status: 'completed',
			started_at: '2026-06-20T00:00:00Z',
			finished_at: '2026-06-20T00:01:00Z',
			message: null
		}
	])
})

test('awaits SDK-backed run and step reads while preserving publish page data', async () => {
	const result = await load({} as Parameters<typeof load>[0])
	if (!result) throw new Error('Expected publish page data')
	for (const [view, name] of [
		[result.audit, 'PublishAudit'],
		[result.publish, 'Publish']
	] as const) {
		expect(view).toEqual({
			jobId: `${name}-id`,
			state: 'completed',
			errors: null,
			logs: [],
			diff,
			failedPieces: [],
			phases: [
				{
					job_id: `${name}-id`,
					phase: 'sync',
					status: 'completed',
					started_at: Date.parse('2026-06-20T00:00:00Z'),
					finished_at: Date.parse('2026-06-20T00:01:00Z'),
					message: null
				}
			]
		})
	}
	expect(query.where).toHaveBeenCalledWith('job_id', '=', 'PublishAudit-id')
	expect(query.where).toHaveBeenCalledWith('job_id', '=', 'Publish-id')
})

test('preserves partial publish failures alongside the source diff without treating audit as partial', async () => {
	const failedPieces = [{ filePath: 'failed.book.md', message: 'missing attachment' }]
	vi.mocked(getLatestWorkflowRun).mockImplementation(async (_backend, name) => ({
		...run(name),
		output: JSON.stringify({ ...diff, failedPieces })
	}))
	const result = await load({} as Parameters<typeof load>[0])
	if (!result) throw new Error('Expected publish page data')
	expect(result.publish).toMatchObject({ state: 'completed', diff, failedPieces })
	expect(result.audit).toMatchObject({ state: 'completed', diff, failedPieces: [] })
})

test('keeps absent run views null', async () => {
	vi.mocked(getLatestWorkflowRun).mockResolvedValue(null)
	const result = await load({} as Parameters<typeof load>[0])
	if (!result) throw new Error('Expected publish page data')
	expect(result.audit).toBeNull()
	expect(result.publish).toBeNull()
	expect(getStepAttempts).not.toHaveBeenCalled()
})
