import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getOpenWorkflow, getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { getWorkflowRun } from '@luzzle/web.jobs'
import { testConnectivity } from './testConnectivity.js'

vi.mock('$lib/server/workflow/index.js', () => ({
	getOpenWorkflow: vi.fn(),
	getOpenWorkflowDb: vi.fn()
}))

vi.mock('@luzzle/web.jobs', () => ({
	getWorkflowRun: vi.fn()
}))

vi.mock('@luzzle/web.jobs/specs', () => ({
	testConnectivitySpec: { name: 'TestConnectivity' }
}))

const mocks = {
	getOpenWorkflow: vi.mocked(getOpenWorkflow),
	getOpenWorkflowDb: vi.mocked(getOpenWorkflowDb),
	getWorkflowRun: vi.mocked(getWorkflowRun)
}

const runWorkflow = vi.fn()

beforeEach(() => {
	vi.clearAllMocks()
	mocks.getOpenWorkflow.mockReturnValue({ runWorkflow } as never)
	mocks.getOpenWorkflowDb.mockReturnValue({} as never)
	runWorkflow.mockResolvedValue({ workflowRun: { id: 'run-1' } })
})

describe('testConnectivity', () => {
	test('triggers the workflow and polls until it completes', async () => {
		mocks.getWorkflowRun.mockReturnValueOnce({ status: 'running' } as never).mockReturnValueOnce({
			status: 'completed',
			output: JSON.stringify({ ok: true })
		} as never)

		const result = await testConnectivity('archive', { pollIntervalMs: 1 })

		expect(runWorkflow).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'TestConnectivity' }),
			{ target: 'archive' }
		)
		expect(result).toEqual({ ok: true })
	})

	test('returns not-ok when the run fails', async () => {
		mocks.getWorkflowRun.mockReturnValue({ status: 'failed', error: 'boom' } as never)

		const result = await testConnectivity('cdn', { pollIntervalMs: 1 })

		expect(result).toEqual({ ok: false, reason: 'boom' })
	})

	test('returns a generic reason when a failed run has no error message', async () => {
		mocks.getWorkflowRun.mockReturnValue({ status: 'canceled', error: null } as never)

		const result = await testConnectivity('cdn', { pollIntervalMs: 1 })

		expect(result).toEqual({ ok: false, reason: 'workflow canceled' })
	})

	test('returns not-ok when the output cannot be parsed', async () => {
		mocks.getWorkflowRun.mockReturnValue({ status: 'completed', output: 'not json' } as never)

		const result = await testConnectivity('archive', { pollIntervalMs: 1 })

		expect(result).toEqual({ ok: false, reason: 'could not parse worker result' })
	})

	test('times out waiting for the worker', async () => {
		mocks.getWorkflowRun.mockReturnValue({ status: 'running' } as never)

		const result = await testConnectivity('archive', { pollIntervalMs: 5, timeoutMs: 20 })

		expect(result).toEqual({
			ok: false,
			reason: expect.stringContaining('timed out waiting for the worker')
		})
	})
})
