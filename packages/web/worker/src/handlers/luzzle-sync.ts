import { Job } from '@sidequest/core'
import type { HandlerContext } from './context.js'
import { runLuzzleSync } from '../lib/luzzle-sync.js'

export class LuzzleSync extends Job {
	async run(ctx: HandlerContext): Promise<string> {
		const { config, logger } = ctx

		await runLuzzleSync(config, logger)

		return 'ok'
	}
}
