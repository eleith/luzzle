import { registerJobProgressPurgeWorkflow } from './job-progress-purge.js'
import { registerPreviewWorkflow } from './preview.js'

export function registerWorkflows(): void {
	registerJobProgressPurgeWorkflow()
	registerPreviewWorkflow()
}
