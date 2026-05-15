import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { runLuzzleSync } from '../lib/luzzle-sync.js'

export class LuzzleSync extends Job {
	async run(): Promise<string> {
		const ctx = getWorkerContext()
		const { config, logger } = ctx

		await runLuzzleSync(config, logger)

		return 'ok'
	}
}
