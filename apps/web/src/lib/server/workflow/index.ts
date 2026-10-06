import path from 'node:path'
import { OpenWorkflow } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { config } from '$lib/server/config.js'

let openWorkflowInstance: OpenWorkflow | null = null
let openWorkflowBackendInstance: BackendSqlite | null = null

function resolveOpenWorkflowDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	const openWorkflowPath = queuePath.replace('sidequest.sqlite', 'openworkflow.sqlite')
	return path.resolve(process.cwd(), openWorkflowPath)
}

export function getOpenWorkflowBackend(): BackendSqlite {
	if (!openWorkflowBackendInstance) {
		openWorkflowBackendInstance = BackendSqlite.connect(resolveOpenWorkflowDbPath())
	}
	return openWorkflowBackendInstance
}

export function getOpenWorkflow(): OpenWorkflow {
	if (!openWorkflowInstance) {
		openWorkflowInstance = new OpenWorkflow({ backend: getOpenWorkflowBackend() })
	}
	return openWorkflowInstance
}
