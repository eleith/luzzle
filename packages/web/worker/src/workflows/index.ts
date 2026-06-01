import { registerJobProgressPurgeWorkflow } from './job-progress-purge.js'

export function registerWorkflows(): void {
	registerJobProgressPurgeWorkflow()
}
