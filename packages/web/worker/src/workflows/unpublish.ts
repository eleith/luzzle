import { unpublishSpec } from '@luzzle/web.jobs/specs'
import { getOpenWorkflow } from '@luzzle/web.jobs'
import type { UnpublishResult } from '@luzzle/web.jobs'
import { getWorkerContext } from '../services/context.js'
import { unpublishPiece } from '../services/unpublish.js'

export function registerUnpublishWorkflow(): void {
	getOpenWorkflow().implementWorkflow(
		unpublishSpec,
		async ({ input, run }): Promise<UnpublishResult> => {
			const ctx = getWorkerContext()
			const fields = { jobId: run.id, filePath: input.filePath }
			ctx.logger.info('unpublish starting', fields)
			try {
				await unpublishPiece(input.filePath, ctx)
			} catch (error) {
				let detail = String(error)
				if (error instanceof Error) detail = error.message
				ctx.logger.error('unpublish failed', { ...fields, error: detail })
				throw error
			}
			ctx.logger.info('unpublish complete', fields)
			return 'ok'
		}
	)
}
