import { OpenWorkflow } from 'openworkflow'
import type { Logger } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'

let openWorkflowInstance: OpenWorkflow | null = null
let openWorkflowBackend: BackendSqlite | null = null
let closePromise: Promise<void> | null = null

export interface InitOpenWorkflowOptions {
	dbPath: string
	logger?: Logger
}

function assertOpen(): void {
	if (closePromise) {
		throw new Error('OpenWorkflow has been closed and cannot be reinitialized.')
	}
}

export function initOpenWorkflow(opts: InitOpenWorkflowOptions): OpenWorkflow {
	assertOpen()
	if (!openWorkflowInstance) {
		openWorkflowBackend = BackendSqlite.connect(opts.dbPath)
		openWorkflowInstance = new OpenWorkflow({ backend: openWorkflowBackend, logger: opts.logger })
	}
	return openWorkflowInstance
}

/** The caller must stop workers before closing their shared backend. */
export function closeOpenWorkflow(): Promise<void> {
	if (!openWorkflowBackend) return Promise.resolve()
	closePromise ??= openWorkflowBackend.stop()
	return closePromise
}

export function getOpenWorkflowBackend(): BackendSqlite {
	getOpenWorkflow()
	return openWorkflowBackend!
}

export function getOpenWorkflow(): OpenWorkflow {
	assertOpen()
	if (!openWorkflowInstance) {
		throw new Error(
			'OpenWorkflow client has not been initialized. Call initOpenWorkflow({ dbPath }) first.'
		)
	}
	return openWorkflowInstance
}

export interface WorkflowRunRow {
	id: string
	workflow_name: string
	status: string
	error: string | null
	input: string
	output: string | null
	finished_at: string | null
	created_at: string
}

export interface StepAttemptRow {
	phase: string
	status: string
	started_at: string | null
	finished_at: string | null
	message: string | null
}

type WorkflowRun = NonNullable<Awaited<ReturnType<BackendSqlite['getWorkflowRun']>>>

function toWorkflowRunRow(run: WorkflowRun): WorkflowRunRow {
	return {
		id: run.id,
		workflow_name: run.workflowName,
		status: run.status,
		error: run.error === null ? null : JSON.stringify(run.error),
		// Keep the existing non-null string DTO even for SDK runs with no input.
		input: JSON.stringify(run.input),
		output: run.output === null ? null : JSON.stringify(run.output),
		finished_at: run.finishedAt?.toISOString() ?? null,
		created_at: run.createdAt.toISOString(),
	}
}

/**
 * Finds the latest workflow run for a given workflow name.
 */
export async function getLatestWorkflowRun(
	backend: Pick<BackendSqlite, 'listWorkflowRuns'>,
	workflowName: string
): Promise<WorkflowRunRow | null> {
	// The SDK lists workflow runs newest first.
	const { data } = await backend.listWorkflowRuns({ workflowName, limit: 1 })
	return data[0] ? toWorkflowRunRow(data[0]) : null
}

/**
 * Finds a workflow run by its unique ID.
 */
export async function getWorkflowRun(
	backend: Pick<BackendSqlite, 'getWorkflowRun'>,
	id: string
): Promise<WorkflowRunRow | null> {
	const run = await backend.getWorkflowRun({ workflowRunId: id })
	return run ? toWorkflowRunRow(run) : null
}

/**
 * Lists all step attempts for a given workflow run ID, oldest first.
 */
export async function getStepAttempts(
	backend: Pick<BackendSqlite, 'listStepAttempts'>,
	workflowRunId: string
): Promise<StepAttemptRow[]> {
	const rows: StepAttemptRow[] = []
	let after: string | undefined

	do {
		// Forward SDK pagination preserves chronological order across pages.
		const page = await backend.listStepAttempts({ workflowRunId, after })
		rows.push(
			...page.data.map((attempt) => ({
				phase: attempt.stepName,
				status: attempt.status,
				started_at: attempt.startedAt?.toISOString() ?? null,
				finished_at: attempt.finishedAt?.toISOString() ?? null,
				message: attempt.error === null ? null : JSON.stringify(attempt.error),
			}))
		)
		after = page.pagination.next ?? undefined
	} while (after)

	return rows
}
