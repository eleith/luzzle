import { Job } from '@sidequest/core'
import type { HandlerContext } from './context.js'
import { runWebSync } from '../lib/web-sync.js'

export class WebSync extends Job {
	async run(ctx: HandlerContext): Promise<string> {
		const { db, config, logger } = ctx

		await runWebSync(db, config, logger)

		return 'ok'
	}
}
