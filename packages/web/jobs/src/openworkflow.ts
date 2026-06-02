import { OpenWorkflow } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { DatabaseSync } from 'node:sqlite'

let owInstance: OpenWorkflow | null = null

export interface InitOpenWorkflowOptions {
	dbPath: string
}

export function initOpenWorkflow(opts: InitOpenWorkflowOptions): OpenWorkflow {
	if (!owInstance) {
		const backend = BackendSqlite.connect(opts.dbPath)
		owInstance = new OpenWorkflow({ backend })
	}
	return owInstance
}

export function getOpenWorkflow(): OpenWorkflow {
	if (!owInstance) {
		throw new Error(
			'OpenWorkflow client has not been initialized. Call initOpenWorkflow({ dbPath }) first.'
		)
	}
	return owInstance
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

/**
 * Finds the latest workflow run for a given workflow name.
 */
export function getLatestWorkflowRun(
	db: DatabaseSync,
	workflowName: string
): WorkflowRunRow | null {
	const stmt = db.prepare(`
		SELECT id, workflow_name, status, error, input, output, finished_at, created_at FROM workflow_runs
		WHERE workflow_name = ?
		ORDER BY created_at DESC
		LIMIT 1
	`)
	const row = stmt.get(workflowName)
	return row ? (row as WorkflowRunRow) : null
}

/**
 * Finds a workflow run by the jobId nested inside its JSON input.
 */
export function getWorkflowRunByJobId(db: DatabaseSync, jobId: number): WorkflowRunRow | null {
	const stmt = db.prepare(`
		SELECT id, workflow_name, status, error, input, output, finished_at, created_at FROM workflow_runs
		WHERE json_extract(input, '$.jobId') = ?
		LIMIT 1
	`)
	const row = stmt.get(jobId)
	return row ? (row as WorkflowRunRow) : null
}

/**
 * Finds a workflow run by its unique ID.
 */
export function getWorkflowRun(
	db: DatabaseSync,
	id: string,
): WorkflowRunRow | null {
	const stmt = db.prepare(`
		SELECT id, workflow_name, status, error, input, output, finished_at, created_at FROM workflow_runs
		WHERE id = ?
		LIMIT 1
	`);
	const row = stmt.get(id);
	return row ? (row as WorkflowRunRow) : null;
}

/**
 * Lists all step attempts for a given workflow run ID.
 */
export function getStepAttempts(db: DatabaseSync, workflowRunId: string): StepAttemptRow[] {
	const stmt = db.prepare(`
		SELECT step_name as phase, status, started_at, finished_at, error as message
		FROM step_attempts
		WHERE workflow_run_id = ?
		ORDER BY created_at ASC
	`)
	const rows = stmt.all(workflowRunId)
	return rows as StepAttemptRow[]
}
