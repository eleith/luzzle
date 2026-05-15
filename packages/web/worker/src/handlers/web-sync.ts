import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { runWebSync } from '../lib/web-sync.js'

export class WebSync extends Job {
	async run(): Promise<string> {
		const ctx = getWorkerContext()
		const { db, config, logger } = ctx

		await runWebSync(db, config, logger)

		return 'ok'
	}
}
