import { registerJobProgressPurgeWorkflow } from './job-progress-purge.js'
import { registerPreviewWorkflow } from './preview.js'
import { registerPublishWorkflow } from './publish.js'

export function registerWorkflows(): void {
	registerJobProgressPurgeWorkflow()
	registerPreviewWorkflow()
	registerPublishWorkflow()
}
