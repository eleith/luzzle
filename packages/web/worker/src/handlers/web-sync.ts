import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { runWebSync } from '../lib/web-sync.js'

export interface WebSyncPayload {
	filePaths: string[]
}

export class WebSync extends Job {
	async run(payload: WebSyncPayload): Promise<string> {
		const ctx = getWorkerContext()
		const { db, config, logger } = ctx

		await runWebSync(db, config, logger, payload.filePaths)

		return 'ok'
	}
}
