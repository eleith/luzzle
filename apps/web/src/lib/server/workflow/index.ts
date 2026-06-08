import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { OpenWorkflow } from 'openworkflow'
import { BackendSqlite } from 'openworkflow/sqlite'
import { config } from '$lib/server/config.js'

let openWorkflowInstance: OpenWorkflow | null = null
let openWorkflowDbInstance: DatabaseSync | null = null

function resolveOpenWorkflowDbPath(): string {
	const queuePath = config.worker?.queue?.path || './data/sidequest.sqlite'
	const openWorkflowPath = queuePath.replace('sidequest.sqlite', 'openworkflow.sqlite')
	return path.resolve(process.cwd(), openWorkflowPath)
}

export function getOpenWorkflow(): OpenWorkflow {
	if (!openWorkflowInstance) {
		const dbPath = resolveOpenWorkflowDbPath()
		const backend = BackendSqlite.connect(dbPath)
		openWorkflowInstance = new OpenWorkflow({ backend })
	}
	return openWorkflowInstance
}

export function getOpenWorkflowDb(): DatabaseSync {
	if (!openWorkflowDbInstance) {
		const db = new DatabaseSync(resolveOpenWorkflowDbPath())
		db.exec('PRAGMA journal_mode = WAL;')
		db.exec('PRAGMA synchronous = NORMAL;')
		db.exec('PRAGMA busy_timeout = 5000;')
		openWorkflowDbInstance = db
	}
	return openWorkflowDbInstance
}
