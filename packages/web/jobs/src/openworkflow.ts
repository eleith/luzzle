import { OpenWorkflow } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import type { DatabaseSync } from 'node:sqlite'

let openWorkflowInstance: OpenWorkflow | null = null

export interface InitOpenWorkflowOptions {
	dbPath: string
}

export function initOpenWorkflow(opts: InitOpenWorkflowOptions): OpenWorkflow {
	if (!openWorkflowInstance) {
		const backend = BackendSqlite.connect(opts.dbPath)
		openWorkflowInstance = new OpenWorkflow({ backend })
	}
	return openWorkflowInstance
}

export function getOpenWorkflow(): OpenWorkflow {
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
		rows.push(...page.data.map(attempt => ({
			phase: attempt.stepName,
			status: attempt.status,
			started_at: attempt.startedAt?.toISOString() ?? null,
			finished_at: attempt.finishedAt?.toISOString() ?? null,
			message: attempt.error === null ? null : JSON.stringify(attempt.error),
		})))
		after = page.pagination.next ?? undefined
	} while (after)

	return rows
}

/**
 * Purges old workflow runs and step attempts from the database in batches of 100.
 * Note: OpenWorkflow will add cron and cleanup in a future release,
 * so we will need to make adjustments later if/when they do.
 */
export function purgeExpiredWorkflowRuns(
	db: DatabaseSync,
	retentionDays: number,
	limit: number = 100
): number {
	const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
	let totalPurged = 0
	let batch: { id: string }[] = []

	do {
		const stmtSelect = db.prepare(`
			SELECT id FROM workflow_runs 
			WHERE created_at < ? 
			LIMIT ?
		`)
		batch = stmtSelect.all(cutoffIso, limit) as { id: string }[]

		if (batch.length > 0) {
			const ids = batch.map(r => r.id)
			const placeholders = ids.map(() => '?').join(',')

			db.prepare(`
				DELETE FROM step_attempts 
				WHERE workflow_run_id IN (${placeholders})
			`).run(...ids)

			db.prepare(`
				DELETE FROM workflow_runs 
				WHERE id IN (${placeholders})
			`).run(...ids)

			totalPurged += batch.length
		}
	} while (batch.length === limit)

	return totalPurged
}
