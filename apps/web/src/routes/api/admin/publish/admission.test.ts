import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getOpenWorkflowBackend } from '$lib/server/workflow/index.js'
import {
	createWorkflowQueue,
	closeWorkflowQueue,
	createPendingRun,
	createCompletedRun,
	claimNextRun,
	completeNextRun,
	type WorkflowQueue
} from '$lib/server/workflow/publish.fixture.js'
import { POST as publish } from './+server.js'
import { POST as audit } from './audit/+server.js'

const { runWorkflow } = vi.hoisted(() => ({ runWorkflow: vi.fn() }))
vi.mock('$lib/server/workflow/index.js', () => ({
	getOpenWorkflow: () => ({ runWorkflow }),
	getOpenWorkflowBackend: vi.fn()
}))

function event(body: unknown = {}) {
	return {
		request: new Request('http://localhost/api/admin/publish', {
			method: 'POST',
			body: JSON.stringify(body)
		})
	} as Parameters<typeof publish>[0] & Parameters<typeof audit>[0]
}

describe('publish/audit admission', () => {
	let queue: WorkflowQueue

	async function enqueue(spec: { name: string }, input: { bisync: boolean }) {
		vi.setSystemTime(new Date('2026-06-21T00:00:00Z'))
		const workflowRun = await createPendingRun(queue.backend, spec.name, input)
		return { workflowRun }
	}

	beforeEach(() => {
		vi.resetAllMocks()
		vi.setSystemTime(new Date('2026-06-20T00:00:00Z'))
		queue = createWorkflowQueue()
		vi.mocked(getOpenWorkflowBackend).mockReturnValue(queue.backend)
		runWorkflow.mockImplementation(async (spec, input) => enqueue(spec, input))
	})

	afterEach(async () => {
		vi.useRealTimers()
		await closeWorkflowQueue(queue)
	})

	test.each([
		{ firstName: 'Publish', firstRoute: publish, otherName: 'Publish', otherRoute: publish },
		{ firstName: 'Publish', firstRoute: publish, otherName: 'PublishAudit', otherRoute: audit },
		{ firstName: 'PublishAudit', firstRoute: audit, otherName: 'Publish', otherRoute: publish },
		{ firstName: 'PublishAudit', firstRoute: audit, otherName: 'PublishAudit', otherRoute: audit }
	])(
		'admits only one overlapping $firstName/$otherName request',
		async ({ firstRoute, otherRoute }) => {
			let release!: () => void
			let entered!: () => void
			const hold = new Promise<void>((resolve) => {
				release = resolve
			})
			const started = new Promise<void>((resolve) => {
				entered = resolve
			})
			runWorkflow.mockImplementationOnce(async (spec, input) => {
				entered()
				await hold
				return enqueue(spec, input)
			})

			const first = Promise.resolve(firstRoute(event()))
			try {
				await Promise.race([
					started,
					first.then(() => {
						throw new Error('First request finished before enqueue')
					})
				])
				const other = otherRoute(event())
				release()
				const [accepted, rejected] = await Promise.all([first, other])
				expect(accepted.status).toBe(200)
				expect(rejected.status).toBe(409)
				expect(await rejected.json()).toEqual(await accepted.json())
				expect(runWorkflow).toHaveBeenCalledTimes(1)
				expect((await queue.backend.countWorkflowRuns()).pending).toBe(1)
			} finally {
				release()
				await first
			}
		}
	)

	test.each([
		{ slowName: 'Publish', slowRoute: publish, otherRoute: audit },
		{ slowName: 'PublishAudit', slowRoute: audit, otherRoute: publish }
	])(
		'does not let a slow $slowName body block other admissions',
		async ({ slowRoute, otherRoute }) => {
			let releaseBody!: () => void
			const body = new Promise<object>((resolve) => {
				releaseBody = () => resolve({})
			})
			const request = { json: vi.fn(() => body) } as unknown as Request
			const slow = Promise.resolve(slowRoute({ ...event(), request }))
			const other = Promise.resolve(otherRoute(event()))
			try {
				await expect.poll(() => runWorkflow.mock.calls.length).toBe(1)
				expect((await other).status).toBe(200)
			} finally {
				releaseBody()
				await Promise.all([slow, other])
			}
			expect((await slow).status).toBe(409)
			expect(await (await slow).json()).toEqual(await (await other).json())
			expect(runWorkflow).toHaveBeenCalledTimes(1)
		}
	)

	test('releases admission after enqueue failure so a waiting request can succeed', async () => {
		let release!: () => void
		let entered!: () => void
		const hold = new Promise<void>((resolve) => {
			release = resolve
		})
		const started = new Promise<void>((resolve) => {
			entered = resolve
		})
		runWorkflow.mockImplementationOnce(async () => {
			entered()
			await hold
			throw new Error('enqueue failed')
		})

		const first = Promise.resolve(publish(event()))
		try {
			await Promise.race([
				started,
				first.then(() => {
					throw new Error('First request finished before enqueue')
				})
			])
			const other = audit(event({ bisync: true }))
			release()
			const [failed, accepted] = await Promise.all([first, other])
			expect(failed.status).toBe(500)
			expect(await failed.text()).toContain('enqueue failed')
			expect(accepted.status).toBe(200)
			expect(runWorkflow).toHaveBeenCalledTimes(2)
			expect(runWorkflow).toHaveBeenLastCalledWith(
				expect.objectContaining({ name: 'PublishAudit' }),
				{ bisync: true }
			)
		} finally {
			release()
			await first
		}
	})

	test('keeps detecting persisted work when enqueue writes the run before rejecting', async () => {
		let persistedRunId: string | undefined
		runWorkflow.mockImplementationOnce(async (spec, input) => {
			persistedRunId = (await enqueue(spec, input)).workflowRun.id
			throw new Error('enqueue response failed')
		})
		expect((await publish(event())).status).toBe(500)
		const rejected = await audit(event())
		expect(rejected.status).toBe(409)
		expect(await rejected.json()).toEqual({ jobId: persistedRunId })
		expect(runWorkflow).toHaveBeenCalledTimes(1)
	})

	test.each([publish, audit])(
		'uses persisted active runs even without a local submission',
		async (route) => {
			const active = await createPendingRun(queue.backend, 'Publish')
			await claimNextRun(queue.backend)
			vi.setSystemTime(new Date('2026-06-20T01:00:00Z'))
			await createCompletedRun(queue.backend, 'Publish')
			const response = await route(event())
			expect(response.status).toBe(409)
			expect(await response.json()).toEqual({ jobId: active.id })
			expect(runWorkflow).not.toHaveBeenCalled()
		}
	)

	test('retains audit freshness checks and releases admission after rejecting an audit', async () => {
		const oldAudit = await createCompletedRun(queue.backend, 'PublishAudit')
		vi.setSystemTime(new Date('2026-06-20T01:00:00Z'))
		const newAudit = await createCompletedRun(queue.backend, 'PublishAudit')
		const rejected = await publish(event({ auditRunId: oldAudit.id }))
		expect(rejected.status).toBe(412)
		expect(await rejected.json()).toEqual({
			message: 'a newer audit has run; re-check before publishing'
		})
		expect(runWorkflow).not.toHaveBeenCalled()

		const accepted = await publish(event({ auditRunId: newAudit.id, bisync: true }))
		expect(accepted.status).toBe(200)
		expect(runWorkflow).toHaveBeenCalledWith(expect.objectContaining({ name: 'Publish' }), {
			bisync: false
		})
	})

	test('does not reuse a consumed audit after the admitted publish finishes', async () => {
		const auditRun = await createCompletedRun(queue.backend, 'PublishAudit')
		const accepted = await publish(event({ auditRunId: auditRun.id }))
		expect(accepted.status).toBe(200)
		const { jobId } = await accepted.json()
		expect((await completeNextRun(queue.backend)).id).toBe(jobId)

		const rejected = await publish(event({ auditRunId: auditRun.id }))
		expect(rejected.status).toBe(412)
		expect(await rejected.json()).toEqual({
			message: 'changes were published after this check; re-check before publishing'
		})
		expect(runWorkflow).toHaveBeenCalledTimes(1)
	})

	test('retains unchecked publish input and tolerates malformed request JSON', async () => {
		const accepted = await publish(event({ bisync: true }))
		expect(accepted.status).toBe(200)
		expect(runWorkflow).toHaveBeenCalledWith(expect.objectContaining({ name: 'Publish' }), {
			bisync: true
		})
		await completeNextRun(queue.backend)
		const request = new Request('http://localhost/api/admin/publish/audit', {
			method: 'POST',
			body: '{'
		})
		expect((await audit({ request } as Parameters<typeof audit>[0])).status).toBe(200)
		expect(runWorkflow).toHaveBeenLastCalledWith(
			expect.objectContaining({ name: 'PublishAudit' }),
			{ bisync: false }
		)
	})
})
