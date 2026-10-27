import { afterEach, expect, test, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createConnection, type AddressInfo, type Socket } from 'node:net'
import { once } from 'node:events'
import { defineWorkflowSpec } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { validateConfig } from '@luzzle/web.config'
import { configSchema } from '@luzzle/web.templates/config'
import type { main as startWorker } from './index.js'
import type * as Workflows from './workflows/index.js'

const probe = defineWorkflowSpec<void, string>({ name: 'ShutdownProbe' })

afterEach(() => {
	vi.useRealTimers()
	vi.doUnmock('./workflows/index.js')
	vi.resetModules()
})

test('starts the native worker and health server, then lets active work finish before closing databases', async () => {
	vi.resetModules()
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date('2026-06-02T12:00:00.000Z'))
	const directory = await fs.mkdtemp(path.join(tmpdir(), 'luzzle-worker-'))
	const queuePath = path.join(directory, 'queue.sqlite')
	const config = validateConfig(
		{
			storage: { root: directory },
			paths: {
				config: path.join(directory, 'config.yaml'),
				database: path.join(directory, 'app.sqlite'),
				assets: path.join(directory, 'assets/pieces'),
			},
			worker: { queue: { path: queuePath } },
		},
		{},
		{ schema: configSchema }
	)
	const jobs = await import('@luzzle/web.jobs')
	let release!: () => void
	const gate = new Promise<void>((resolve) => {
		release = resolve
	})
	let entered = false
	vi.doMock('./workflows/index.js', async () => {
		const actual = await vi.importActual<typeof Workflows>('./workflows/index.js')
		return {
			registerWorkflows() {
				actual.registerWorkflows()
				jobs.getOpenWorkflow().implementWorkflow(probe, async ({ step }) =>
					step.run({ name: 'active-work' }, async () => {
						entered = true
						await gate
						return 'finished'
					})
				)
			},
		}
	})
	let running: Awaited<ReturnType<typeof startWorker>> | undefined
	let stalledHealth: Socket | undefined
	try {
		const { main } = await import('./index.js')
		running = await main(config, 0)
		const { port } = running.server.address() as AddressInfo
		expect((await fetch(`http://127.0.0.1:${port}/health`)).status).toBe(200)
		const backend = jobs.getOpenWorkflowBackend()
		expect(await jobs.getOpenWorkflow().schedules.get('luzzle:job-progress-purge')).toMatchObject({
			cron: '0 48 1 * * *',
			timezone: 'UTC',
			nextRunAt: new Date('2026-06-03T01:48:00.000Z'),
		})
		expect((await backend.listWorkflowRuns({ workflowName: 'JobProgressPurge' })).data).toEqual([])
		const handle = await jobs.getOpenWorkflow().runWorkflow(probe)
		await expect.poll(() => entered).toBe(true)

		const accepted = once(running.server, 'connection')
		stalledHealth = createConnection(port, '127.0.0.1')
		stalledHealth.on('error', () => {})
		await once(stalledHealth, 'connect')
		await accepted
		stalledHealth.write('GET /health HTTP/1.1\r\nHost: localhost\r\n')
		let healthConnectionClosed = false
		stalledHealth.once('close', () => {
			healthConnectionClosed = true
		})

		const stopping = running.stop()
		expect(running.stop()).toBe(stopping)
		await expect.poll(() => running!.server.listening).toBe(false)
		await expect.poll(() => healthConnectionClosed).toBe(true)
		const { getWorkerContext } = await import('./services/context.js')
		expect(await getWorkerContext().db.selectFrom('job_progress').selectAll().execute()).toEqual([])
		expect(await backend.getWorkflowRun({ workflowRunId: handle.workflowRun.id })).toMatchObject({
			status: 'running',
		})

		release()
		await stopping
		expect(() => jobs.getOpenWorkflow()).toThrow(/closed/)
		const reopened = BackendSqlite.connect(queuePath)
		try {
			expect(await reopened.getWorkflowRun({ workflowRunId: handle.workflowRun.id })).toMatchObject(
				{ status: 'completed', output: 'finished' }
			)
			expect(
				(await reopened.listWorkflowRuns({ workflowName: 'JobProgressPurge' })).data
			).toHaveLength(0)
		} finally {
			await reopened.stop()
		}
	} finally {
		release()
		stalledHealth?.destroy()
		await running?.stop()
		await fs.rm(directory, { recursive: true, force: true })
	}
}, 15_000)
