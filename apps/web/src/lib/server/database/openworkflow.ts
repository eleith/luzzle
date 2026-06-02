import { DatabaseSync } from 'node:sqlite'
import { OpenWorkflow } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { resolveOpenWorkflowDbPath } from '$lib/server/queue.js'

let owInstance: OpenWorkflow | null = null
let dbInstance: DatabaseSync | null = null

export function getOpenWorkflow(): OpenWorkflow {
	if (!owInstance) {
		const dbPath = resolveOpenWorkflowDbPath()
		const backend = BackendSqlite.connect(dbPath)
		owInstance = new OpenWorkflow({ backend })
	}
	return owInstance
}

export function getOpenWorkflowDb(): DatabaseSync {
	if (!dbInstance) {
		dbInstance = new DatabaseSync(resolveOpenWorkflowDbPath())
	}
	return dbInstance
}
