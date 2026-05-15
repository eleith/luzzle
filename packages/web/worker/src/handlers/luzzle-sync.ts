import { Job } from '@sidequest/core'
import { getWorkerContext } from './context.js'
import { runLuzzleSync } from '../lib/luzzle-sync.js'

export class LuzzleSync extends Job {
	async run(): Promise<{ changedPaths: string[] }> {
		const ctx = getWorkerContext()
		const { config, logger } = ctx

		return runLuzzleSync(config, logger)
	}
}
