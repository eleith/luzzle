import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { BackendSqlite } from 'openworkflow/sqlite'
import {
	initOpenWorkflow,
	getOpenWorkflow,
	getLatestWorkflowRun,
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
		expect(initOpenWorkflow({ dbPath: ':memory:' })).toBe(client)
	})
})

type CreateRunParams = Parameters<BackendSqlite['createWorkflowRun']>[0]
type RunError = Parameters<BackendSqlite['failWorkflowRun']>[0]['error']
type StepAttempt = Awaited<ReturnType<BackendSqlite['createStepAttempt']>>

const workerId = 'read-helper-test'
const initialTime = new Date('2026-06-02T05:00:00.000Z')

describe('SDK read helpers', () => {
	let backend: BackendSqlite

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(initialTime)
		backend = BackendSqlite.connect(':memory:')
	})

	afterEach(async () => {
		vi.restoreAllMocks()
		vi.useRealTimers()
		await backend.stop()
	})

	function createRun(overrides: Partial<CreateRunParams> = {}) {
		return backend.createWorkflowRun({
			workflowName: 'Publish',
			version: null,
			idempotencyKey: null,
			config: {},
			context: null,
			input: { jobId: 123 },
			parentStepAttemptNamespaceId: null,
			parentStepAttemptId: null,
			availableAt: null,
			deadlineAt: null,
			...overrides,
		})
	}

	async function claimRun(id: string) {
		const claimed = await backend.claimWorkflowRun({ workerId, leaseDurationMs: 60_000 })
		expect(claimed?.id).toBe(id)
	}

	function createStep(workflowRunId: string, stepName: string) {
		return backend.createStepAttempt({
			workflowRunId,
			workerId,
			stepName,
			kind: 'function',
			config: {},
			context: null,
		})
	}

	test('returns null or an empty list for missing runs', async () => {
		expect(await getLatestWorkflowRun(backend, 'Publish')).toBeNull()
		expect(await getWorkflowRun(backend, 'missing')).toBeNull()
		expect(await getStepAttempts(backend, 'missing')).toEqual([])
	})

	test('returns the newest matching workflow as the existing DTO, not an SDK run', async () => {
		const first = await createRun()
		vi.setSystemTime(new Date('2026-06-02T05:10:00.000Z'))
		const latest = await createRun({ input: { jobId: 456, assets: ['cover'] } })
		vi.setSystemTime(new Date('2026-06-02T05:20:00.000Z'))
		await createRun({ workflowName: 'Preview' })

		expect(await getLatestWorkflowRun(backend, 'Publish')).toEqual({
			id: latest.id,
			workflow_name: 'Publish',
			status: 'pending',
			error: null,
			input: '{"jobId":456,"assets":["cover"]}',
			output: null,
			finished_at: null,
			created_at: '2026-06-02T05:10:00.000Z',
		})
		expect(await getWorkflowRun(backend, latest.id)).toEqual(
			await getLatestWorkflowRun(backend, 'Publish')
		)
		expect((await getWorkflowRun(backend, first.id))?.id).toBe(first.id)
		expect(await getLatestWorkflowRun(backend, 'Unknown')).toBeNull()
	})

	test.each([
		{ input: { jobId: 123 }, output: { published: ['cover'], count: 1 } },
		{ input: 'input string', output: 'ok' },
		{ input: '', output: '' },
		{ input: false, output: false },
		{ input: 0, output: 0 },
		{ input: null, output: null },
	])('serializes input/output JSON and completed ISO timestamps: %j', async ({ input, output }) => {
		const run = await createRun({ input })
		await claimRun(run.id)
		vi.setSystemTime(new Date('2026-06-02T05:01:00.000Z'))
		await backend.completeWorkflowRun({ workflowRunId: run.id, workerId, output })

		expect(await getWorkflowRun(backend, run.id)).toEqual({
			id: run.id,
			workflow_name: 'Publish',
			status: 'completed',
			error: null,
			input: JSON.stringify(input),
			output: output === null ? null : JSON.stringify(output),
			finished_at: '2026-06-02T05:01:00.000Z',
			created_at: initialTime.toISOString(),
		})
	})

	test.each([
		{ name: 'PublishError', message: 'upload failed', stack: 'stack', detail: { code: 503 } },
		'legacy failure',
		'',
	])('preserves workflow error JSON encoding: %j', async error => {
		const run = await createRun()
		await claimRun(run.id)
		vi.setSystemTime(new Date('2026-06-02T05:02:00.000Z'))
		await backend.failWorkflowRun({
			workflowRunId: run.id,
			workerId,
			// The public mutation type requires an object, but SQLite also stores
			// string JSON errors. Exercise that compatibility through the real API.
			error: error as unknown as RunError,
			retryPolicy: {
				maximumAttempts: 1,
				initialInterval: '1s',
				maximumInterval: '1s',
				backoffCoefficient: 1,
			},
		})

		const expected = {
			id: run.id,
			workflow_name: 'Publish',
			status: 'failed',
			error: JSON.stringify(error),
			input: '{"jobId":123}',
			output: null,
			finished_at: '2026-06-02T05:02:00.000Z',
			created_at: initialTime.toISOString(),
		}
		expect(await getWorkflowRun(backend, run.id)).toEqual(expected)
		expect(await getLatestWorkflowRun(backend, 'Publish')).toEqual(expected)
	})

	test('maps completed and running step attempts, omitting SDK internals', async () => {
		const run = await createRun()
		await claimRun(run.id)
		expect(await getStepAttempts(backend, run.id)).toEqual([])
		const completed = await createStep(run.id, 'parse')
		vi.setSystemTime(new Date('2026-06-02T05:01:00.000Z'))
		await backend.completeStepAttempt({
			workflowRunId: run.id,
			stepAttemptId: completed.id,
			workerId,
			output: { internalStepResult: true },
		})
		await createStep(run.id, 'transform')

		expect(await getStepAttempts(backend, run.id)).toEqual([
			{
				phase: 'parse',
				status: 'completed',
				started_at: initialTime.toISOString(),
				finished_at: '2026-06-02T05:01:00.000Z',
				message: null,
			},
			{
				phase: 'transform',
				status: 'running',
				started_at: '2026-06-02T05:01:00.000Z',
				finished_at: null,
				message: null,
			},
		])
	})

	test('maps an absent SDK step start time to the existing nullable DTO field', async () => {
		const run = await createRun()
		await claimRun(run.id)
		await createStep(run.id, 'wait')
		const original = backend.listStepAttempts.bind(backend)
		vi.spyOn(backend, 'listStepAttempts').mockImplementation(async params => {
			const page = await original(params)
			return { ...page, data: page.data.map(attempt => ({ ...attempt, startedAt: null })) }
		})
		expect(await getStepAttempts(backend, run.id)).toEqual([{
			phase: 'wait', status: 'running', started_at: null, finished_at: null, message: null,
		}])
	})

	test.each([
		{ name: 'TransformError', message: 'transform failed', detail: ['cover'] },
		'legacy step failure',
		'',
	])('preserves step error JSON as message: %j', async error => {
		const run = await createRun()
		await claimRun(run.id)
		const step = await createStep(run.id, 'transform')
		vi.setSystemTime(new Date('2026-06-02T05:03:00.000Z'))
		await backend.failStepAttempt({
			workflowRunId: run.id,
			stepAttemptId: step.id,
			workerId,
			error: error as unknown as RunError,
		})

		expect(await getStepAttempts(backend, run.id)).toEqual([{
			phase: 'transform',
			status: 'failed',
			started_at: initialTime.toISOString(),
			finished_at: '2026-06-02T05:03:00.000Z',
			message: JSON.stringify(error),
		}])
	})

	test('follows every SDK page in chronological order, including timestamp ties and retries', async () => {
		const run = await createRun()
		await claimRun(run.id)
		const attempts: StepAttempt[] = []
		for (let i = 0; i < 7; i++) {
			// Shared timestamps also exercise the SDK cursor ID tie-breaker.
			vi.setSystemTime(new Date(initialTime.getTime() + Math.floor(i / 3) * 1000))
			const step = await createStep(run.id, `phase-${i % 3}`)
			attempts.push(await backend.completeStepAttempt({
				workflowRunId: run.id,
				stepAttemptId: step.id,
				workerId,
				output: null,
			}))
		}
		const other = await createRun({ workflowName: 'Preview' })
		await claimRun(other.id)
		await createStep(other.id, 'not-this-run')

		const original = backend.listStepAttempts.bind(backend)
		const list = vi.spyOn(backend, 'listStepAttempts')
			.mockImplementation(params => original({ ...params, limit: 2 }))
		const rows = await getStepAttempts(backend, run.id)
		const expected = attempts
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
			.map(attempt => ({
				phase: attempt.stepName,
				status: 'completed',
				started_at: attempt.startedAt!.toISOString(),
				finished_at: attempt.finishedAt!.toISOString(),
				message: null,
			}))

		expect(rows).toHaveLength(7)
		expect(rows).toEqual(expected)
		expect(list).toHaveBeenCalledTimes(4)
		for (let i = 1; i < list.mock.calls.length; i++) {
			const previousPage = await list.mock.results[i - 1].value
			expect(list.mock.calls[i][0]).toEqual({
				workflowRunId: run.id,
				after: previousPage.pagination.next,
			})
		}
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
