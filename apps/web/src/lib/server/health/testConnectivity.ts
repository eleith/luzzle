import { getOpenWorkflow, getOpenWorkflowDb } from '$lib/server/workflow/index.js'
import { getWorkflowRun, type TestConnectivityResult } from '@luzzle/web.jobs'
import { testConnectivitySpec } from '@luzzle/web.jobs/specs'

const TERMINAL_STATES = new Set(['completed', 'succeeded', 'failed', 'canceled'])
const POLL_INTERVAL_MS = 200
const POLL_TIMEOUT_MS = 15000

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function testConnectivity(
	target: 'archive' | 'cdn',
	options: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<TestConnectivityResult> {
	const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS
	const timeoutMs = options.timeoutMs ?? POLL_TIMEOUT_MS

	const openWorkflow = getOpenWorkflow()
	const handle = await openWorkflow.runWorkflow(testConnectivitySpec, { target })
	const runId = handle.workflowRun.id
	const openWorkflowDb = getOpenWorkflowDb()

	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const run = getWorkflowRun(openWorkflowDb, runId)
		if (run && TERMINAL_STATES.has(run.status)) {
			if (run.status === 'failed' || run.status === 'canceled') {
				return { ok: false, reason: run.error ?? `workflow ${run.status}` }
			}
			try {
				const parsed: unknown = JSON.parse(run.output ?? 'null')
				if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
					return parsed as TestConnectivityResult
				}
			} catch {
				// falls through to the generic failure below
			}
			return { ok: false, reason: 'could not parse worker result' }
		}
		await sleep(pollIntervalMs)
	}

	return { ok: false, reason: `timed out waiting for the worker after ${timeoutMs}ms` }
}
