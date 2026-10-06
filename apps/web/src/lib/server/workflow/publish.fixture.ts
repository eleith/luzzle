import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { BackendSqlite } from 'openworkflow/sqlite'

export function createWorkflowQueue() {
	const directory = mkdtempSync(path.join(tmpdir(), 'luzzle-workflow-'))
	const filename = path.join(directory, 'queue.sqlite')
	const backend = BackendSqlite.connect(filename)
	const db = new DatabaseSync(filename)
	return { directory, backend, db }
}

export type WorkflowQueue = ReturnType<typeof createWorkflowQueue>

export async function closeWorkflowQueue(queue: WorkflowQueue): Promise<void> {
	queue.db.close()
	await queue.backend.stop()
	rmSync(queue.directory, { recursive: true, force: true })
}

export function createPendingRun(
	backend: BackendSqlite,
	workflowName: string,
	input: Record<string, boolean> = {}
) {
	return backend.createWorkflowRun({
		workflowName,
		version: null,
		idempotencyKey: null,
		config: {},
		context: null,
		input,
		parentStepAttemptNamespaceId: null,
		parentStepAttemptId: null,
		availableAt: null,
		deadlineAt: null
	})
}

export async function claimNextRun(backend: BackendSqlite) {
	const run = await backend.claimWorkflowRun({
		workerId: 'fixture-worker',
		leaseDurationMs: 60_000
	})
	if (!run) throw new Error('Expected a pending workflow run')
	return run
}

export async function completeNextRun(backend: BackendSqlite) {
	const run = await claimNextRun(backend)
	return backend.completeWorkflowRun({
		workflowRunId: run.id,
		workerId: 'fixture-worker',
		output: null
	})
}

export async function createCompletedRun(backend: BackendSqlite, workflowName: string) {
	const run = await createPendingRun(backend, workflowName)
	const completed = await completeNextRun(backend)
	if (completed.id !== run.id) throw new Error('Fixture completed a different pending run')
	return completed
}
